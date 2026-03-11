import { parseString } from "whatsapp-chat-parser";
import type { ParsedMessage, ParsedChat, ChatMember, MediaFile } from "./types";
import { extractStats } from "./extract-stats";

export async function parseWhatsAppChat(
  content: string,
  media?: Map<string, MediaFile>,
  fileName?: string
): Promise<ParsedChat> {
  // Strip invisible Unicode LTR marks (iOS exports add these)
  const cleaned = content.replace(/\u200e/g, "");

  const rawMessages = parseString(cleaned, {
    parseAttachments: true,
  }) as ParsedMessage[];

  if (rawMessages.length === 0) {
    throw new Error("no_messages_parsed");
  }

  enrichMessages(rawMessages);

  // Extract unique members
  const memberMap = new Map<
    string,
    { messages: ParsedMessage[]; firstSeen: Date; lastSeen: Date }
  >();

  // Extract group name early so we can filter it out as a member
  const groupName = extractGroupName(rawMessages, fileName);

  for (const msg of rawMessages) {
    if (!msg.author) continue; // skip system messages
    if (isSystemAuthor(msg.author)) continue; // skip WhatsApp pseudo-authors
    if (isSystemMessage(msg.message)) continue; // skip "X added Y" style messages
    // Skip group name appearing as author (WhatsApp sometimes does this)
    if (groupName && msg.author === groupName) continue;

    const existing = memberMap.get(msg.author);
    if (existing) {
      existing.messages.push(msg);
      if (msg.date < existing.firstSeen) existing.firstSeen = msg.date;
      if (msg.date > existing.lastSeen) existing.lastSeen = msg.date;
    } else {
      memberMap.set(msg.author, {
        messages: [msg],
        firstSeen: msg.date,
        lastSeen: msg.date,
      });
    }
  }

  // Remove "members" with only a few messages that are all system-like or media-omitted
  for (const [name, data] of memberMap) {
    if (data.messages.length > 3) continue;
    const allJunk = data.messages.every(
      (m) =>
        isMediaOmitted(m.message) ||
        isSystemMessage(m.message) ||
        m.message.trim().length === 0
    );
    if (allJunk) memberMap.delete(name);
  }

  // Remove any "member" that is actually the group name leaking through
  // (catches cases where extractGroupName() couldn't find it from system msgs)
  for (const [name, data] of memberMap) {
    if (isLikelyGroupName(name, data.messages, rawMessages)) {
      memberMap.delete(name);
    }
  }

  const members: ChatMember[] = Array.from(memberMap.entries()).map(
    ([name, data]) => ({
      displayName: name,
      messageCount: data.messages.length,
      firstMessage: data.firstSeen,
      lastMessage: data.lastSeen,
      aliases: [],
    })
  );

  // Sort members by message count (most active first)
  members.sort((a, b) => b.messageCount - a.messageCount);

  if (members.length < 2) {
    throw new Error("not_enough_members");
  }

  // Sanitize: strip author from system messages so ALL downstream consumers
  // automatically skip them (stats, samples, game questions, profiles, etc.)
  const validMemberNames = new Set(members.map((m) => m.displayName));
  for (const msg of rawMessages) {
    if (!msg.author) continue;
    if (isSystemAuthor(msg.author) || isSystemMessage(msg.message) || !validMemberNames.has(msg.author)) {
      msg.author = null as unknown as string;
    }
  }

  const stats = extractStats(rawMessages, members);

  return {
    messages: rawMessages,
    members,
    stats,
    groupName,
    media: media ?? new Map(),
  };
}

function extractGroupName(
  messages: ParsedMessage[],
  fileName?: string
): string | null {
  // 1. Try extracting from the file name first — most reliable source
  // WhatsApp exports are named "WhatsApp Chat with GroupName.txt" or
  // "WhatsApp Chat - GroupName.zip" or "צ'אט WhatsApp עם GroupName.txt"
  if (fileName) {
    const nameOnly = fileName.replace(/\.(zip|txt)$/i, "").trim();
    const enFileMatch = nameOnly.match(
      /WhatsApp Chat (?:with|-)[\s]*(.+)/i
    );
    if (enFileMatch) return enFileMatch[1].trim();
    const heFileMatch = nameOnly.match(/צ'?אט WhatsApp עם[\s]*(.+)/i);
    if (heFileMatch) return heFileMatch[1].trim();
    // Folder name pattern (unzipped): "WhatsApp Chat with GroupName"
    const folderMatch = nameOnly.match(/^WhatsApp Chat[\s\-]+(.+)/i);
    if (folderMatch) return folderMatch[1].trim();
  }

  // 2. Try system messages in the chat
  for (const msg of messages) {
    if (msg.author !== null) continue;

    // Try Hebrew group creation
    const heMatch = msg.message.match(/יצר[הא] את הקבוצה "(.+?)"/);
    if (heMatch) return heMatch[1];

    // Try English group creation
    const enMatch = msg.message.match(/created group "(.+?)"/);
    if (enMatch) return enMatch[1];

    // Try subject change pattern (Hebrew)
    const heSubject = msg.message.match(/שינ[הא] את נושא הקבוצה.*?"(.+?)"/);
    if (heSubject) return heSubject[1];

    // Try subject change pattern (English)
    const enSubject = msg.message.match(
      /changed the subject.*?to "(.+?)"/
    );
    if (enSubject) return enSubject[1];

    // Skip "added" messages — those contain person names
    const addedHe = msg.message.match(/^(.+?) הוסיפ?[הא]? את .+/);
    if (addedHe) continue;

    // Quoted group name in system message
    const quotedName = msg.message.match(/^"(.+?)"$/);
    if (quotedName) return quotedName[1];
  }

  return null;
}

/**
 * Detect if an "author" is actually the group name that leaked through.
 * Multi-layer heuristic — checks system messages, message patterns, and
 * compares behavior to other members in the chat.
 */
function isLikelyGroupName(
  author: string,
  authorMessages: ParsedMessage[],
  allMessages: ParsedMessage[]
): boolean {
  // Layer 1: Check system messages for references to this name
  for (const msg of allMessages) {
    if (msg.author !== null) continue;
    const text = msg.message;

    // If a system message references this name as a group subject → group name
    if (
      text.includes(`"${author}"`) ||
      (text.includes("נושא הקבוצה") && text.includes(author)) ||
      (text.includes("the subject") && text.includes(author))
    ) {
      return true;
    }

    // If someone "added" this author → real person, not group name
    if (
      (text.includes("הוסיף את") ||
        text.includes("הוסיפה את") ||
        text.includes("added")) &&
      text.includes(author)
    ) {
      return false;
    }
  }

  // Layer 2: Count how many of their messages are system-like or empty
  let systemLikeCount = 0;
  for (const m of authorMessages) {
    if (
      isSystemMessage(m.message) ||
      isMediaOmitted(m.message) ||
      m.message.trim().length === 0 ||
      isEncryptionNotice(m.message)
    ) {
      systemLikeCount++;
    }
  }

  // If ALL messages are system-like → group name regardless of count
  if (systemLikeCount === authorMessages.length) return true;

  // If >80% of messages are system-like and they have ≤15 messages → likely group name
  if (
    authorMessages.length <= 15 &&
    systemLikeCount / authorMessages.length > 0.8
  ) {
    return true;
  }

  // Layer 3: If the first message from this "author" is the encryption notice
  // or a system-like message, and they appear very early in the chat → suspicious
  const firstMsg = authorMessages[0];
  if (firstMsg) {
    const firstMsgIndex = allMessages.indexOf(firstMsg);
    if (
      firstMsgIndex <= 3 &&
      (isEncryptionNotice(firstMsg.message) ||
        isSystemMessage(firstMsg.message))
    ) {
      return true;
    }
  }

  return false;
}

function isEncryptionNotice(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("end-to-end encrypted") ||
    lower.includes("מוצפנות מקצה") ||
    lower.includes("messages and calls") ||
    lower.includes("הודעות ושיחות")
  );
}

// Pre-compiled regex for system author detection — single test vs 30+ includes() calls
const SYSTEM_AUTHOR_PATTERNS = [
  "end-to-end encrypted", "messages and calls", "you were added",
  "changed the subject", "changed the group", "changed this group",
  "created group", "security code changed", "this message was deleted",
  "you deleted this message", "missed voice call", "missed video call",
  "disappearing messages", "turned on disappearing", "turned off disappearing",
  "joined using", "waiting for this message", "message timer",
  "blocked this contact", "unblocked this contact", "business account",
  "your security code", "you changed this group",
  "this chat is with a business", "tap for more info",
  "הודעות ושיחות", "מוצפנות מקצה", "הוספת", "שינה את", "שינתה את",
  "יצר את הקבוצה", "יצרה את הקבוצה", "קוד האבטחה השתנה",
  "הודעה זו נמחקה", "מחקת הודעה זו", "שיחת קול שלא נענתה",
  "שיחת וידאו שלא נענתה", "הודעות נעלמות",
  "הפעיל הודעות נעלמות", "הפעילה הודעות נעלמות",
  "כיבה הודעות נעלמות", "כיבתה הודעות נעלמות",
  "ממתין להודעה זו", "חשבון עסקי", "הקש למידע נוסף", "קוד האבטחה שלך",
];

const SYSTEM_AUTHOR_REGEX = new RegExp(
  SYSTEM_AUTHOR_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

/** Filter out WhatsApp system pseudo-authors that the parser sometimes misidentifies */
function isSystemAuthor(author: string): boolean {
  // Very short "authors" that are likely parsing artifacts (single char, tilde)
  if (author.trim().length <= 1) return true;

  return SYSTEM_AUTHOR_REGEX.test(author);
}

function isMediaOmitted(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("<media omitted>") ||
    lower.includes("מדיה לא נכללה") ||
    lower.includes("<attached:") ||
    lower.includes("(file attached)")
  );
}

// Pre-compiled regex for system message detection
const SYSTEM_MSG_PATTERNS = [
  "added ", " added ", " removed ", " left the group", "joined using this group",
  "joined the group", "was added", "was removed", "created group",
  "changed the subject", "changed the group", "changed this group",
  "you're now an admin", "is no longer an admin",
  "turned on disappearing", "turned off disappearing", "pinned a message",
  "messages and calls are end-to-end encrypted",
  "הוסיף את", "הוסיפה את", "הוסיף/ה את", "הוסר/ה",
  "הוסר מהקבוצה", "הוסרה מהקבוצה",
  "הצטרף באמצעות", "הצטרפה באמצעות", "הצטרף/ה באמצעות",
  "הצטרף לקבוצה", "הצטרפה לקבוצה", "הצטרף/ה לקבוצה",
  "עזב את הקבוצה", "עזבה את הקבוצה",
  "הוזמן/ה לקבוצה", "צורף/ה לקבוצה", "צורף לקבוצה", "צורפה לקבוצה",
  "שינה את נושא", "שינתה את נושא", "שינה את סמל", "שינתה את סמל",
  "את/ה מנהל/ת עכשיו", "כבר לא מנהל",
  "הפעיל הודעות נעלמות", "הפעילה הודעות נעלמות",
  "כיבה הודעות נעלמות", "כיבתה הודעות נעלמות",
  "הצמיד/ה הודעה", "הצמיד הודעה", "הצמידה הודעה",
  "ההודעות והשיחות מוצפנות",
  "יצר את הקבוצה", "יצרה את הקבוצה", "יצר/ה את הקבוצה",
];

const SYSTEM_MSG_REGEX = new RegExp(
  SYSTEM_MSG_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

const SYSTEM_MSG_EXACT = new Set(["left", "עזב", "עזבה"]);

/** Filter out system-generated messages even when they have a real author */
export function isSystemMessage(message: string): boolean {
  const lower = message.toLowerCase();
  if (SYSTEM_MSG_EXACT.has(lower.trim())) return true;
  return SYSTEM_MSG_REGEX.test(lower);
}

export function isMediaMessage(message: string): boolean {
  return (
    message === "<Media omitted>" ||
    message.includes("<attached:") ||
    message.includes("(file attached)")
  );
}

// Pre-compiled regexes for message metadata enrichment
const FORWARDED_RE = /^(Forwarded|הועבר)/i;
const DELETED_RE =
  /^(this message was deleted|you deleted this message|הודעה זו נמחקה|מחקת הודעה זו)$/i;
const EDITED_RE = /\(edited\)|\(ערוך\)$/i;
const LINK_RE = /https?:\/\/\S+/;

/** Enrich raw messages with metadata extracted from message text. Single pass, mutates in place. */
function enrichMessages(messages: ParsedMessage[]): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const text = msg.message;
    const firstLine = text.split("\n")[0]?.trim() ?? "";

    msg.meta = {
      isForwarded: FORWARDED_RE.test(firstLine),
      isDeleted: DELETED_RE.test(text.trim()),
      isEdited: EDITED_RE.test(text),
      quotedText: firstLine.startsWith(">") ? firstLine.slice(1).trim() : null,
      isConsecutive: prev?.author != null && prev.author === msg.author,
      hasLink: LINK_RE.test(text),
      hasQuestion: text.includes("?") || text.includes("؟"),
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  }
}

/** Check if a message is a deleted message (preserves author for stats) */
export function isDeletedMessage(message: string): boolean {
  return DELETED_RE.test(message.trim());
}

export function getMediaType(
  message: string,
  fileName?: string
): "image" | "video" | "voice" | "sticker" | "document" | "text" {
  const name = fileName?.toLowerCase() ?? message.toLowerCase();

  if (name.match(/\.(jpg|jpeg|png|gif|webp)/) || name.includes("img"))
    return "image";
  if (name.match(/\.(mp4|mov|avi)/) || name.includes("vid")) return "video";
  if (name.match(/\.(opus|ogg|m4a|mp3)/) || name.includes("ptt"))
    return "voice";
  if (name.includes("sticker") || name.includes(".webp")) return "sticker";
  if (name.match(/\.(pdf|doc|docx|xls|xlsx)/)) return "document";

  return "text";
}
