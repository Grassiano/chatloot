import { parseString } from "whatsapp-chat-parser";
import type { ParsedMessage, ParsedChat, ChatMember, MediaFile } from "./types";
import { extractStats } from "./extract-stats";

export async function parseWhatsAppChat(
  content: string,
  media?: Map<string, MediaFile>
): Promise<ParsedChat> {
  // Strip invisible Unicode LTR marks (iOS exports add these)
  const cleaned = content.replace(/\u200e/g, "");

  const rawMessages = parseString(cleaned, {
    parseAttachments: true,
  }) as ParsedMessage[];

  if (rawMessages.length === 0) {
    throw new Error("no_messages_parsed");
  }

  // Extract unique members
  const memberMap = new Map<
    string,
    { messages: ParsedMessage[]; firstSeen: Date; lastSeen: Date }
  >();

  // Extract group name early so we can filter it out as a member
  const groupName = extractGroupName(rawMessages);

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

  const stats = extractStats(rawMessages, members);

  return {
    messages: rawMessages,
    members,
    stats,
    groupName,
    media: media ?? new Map(),
  };
}

function extractGroupName(messages: ParsedMessage[]): string | null {
  // Look for group creation system messages
  // Hebrew: "אליס יצרה את הקבוצה "שם הקבוצה""
  // English: 'Alice created group "Group Name"'
  for (const msg of messages) {
    if (msg.author !== null) continue;

    // Try Hebrew pattern
    const heMatch = msg.message.match(/יצר[הא] את הקבוצה "(.+?)"/);
    if (heMatch) return heMatch[1];

    // Try English pattern
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

    // Fallback: "Messages and calls are end-to-end encrypted" lines sometimes
    // contain the group name. Also catch Hebrew encryption notice that may
    // include the group name.
    // Pattern: "X הוסיף את Y." or "X added Y." — extract the group context
    const addedHe = msg.message.match(/^(.+?) הוסיפ?[הא]? את .+/);
    if (addedHe) continue; // these are person names, not group names

    // Some exports have a first system message that IS the group name or
    // "Group name: <name>" — catch quoted group names in system messages
    const quotedName = msg.message.match(/^"(.+?)"$/);
    if (quotedName) return quotedName[1];
  }

  return null;
}

/**
 * Detect if an "author" is actually the group name that leaked through.
 * Heuristic: if ALL their messages are system-like or very short (≤2 chars),
 * and their name appears in system messages referring to the group, they're
 * likely the group name, not a real person.
 */
function isLikelyGroupName(
  author: string,
  authorMessages: ParsedMessage[],
  allMessages: ParsedMessage[]
): boolean {
  // Check if this author name appears in system messages as a group reference
  // Pattern: "הוסיף את X" or "added X" where X mentions this author
  // OR the author name appears in a system message about the group
  for (const msg of allMessages) {
    if (msg.author !== null) continue;
    const text = msg.message;

    // If a system message references this name as a group subject
    if (
      text.includes(`"${author}"`) ||
      text.includes(`נושא הקבוצה`) && text.includes(author) ||
      text.includes(`the subject`) && text.includes(author)
    ) {
      return true;
    }

    // If a system message says someone "added" or "removed" this author,
    // they're a real person, not the group name
    if (
      (text.includes("הוסיף את") || text.includes("הוסיפה את") ||
       text.includes("added")) &&
      text.includes(author)
    ) {
      return false;
    }
  }

  // If ALL their "messages" are system-like, they're probably not real
  const allSystemLike = authorMessages.every(
    (m) =>
      isSystemMessage(m.message) ||
      isMediaOmitted(m.message) ||
      m.message.trim().length === 0
  );
  if (allSystemLike && authorMessages.length <= 5) return true;

  return false;
}

/** Filter out WhatsApp system pseudo-authors that the parser sometimes misidentifies */
function isSystemAuthor(author: string): boolean {
  // Phone-number-only names (e.g. "+972 50-123-4567")
  if (/^[\d\s+\-().]+$/.test(author)) return true;

  // Very short "authors" that are likely parsing artifacts (single char, tilde)
  if (author.trim().length <= 1) return true;

  const lower = author.toLowerCase();
  const systemPatterns = [
    // English system strings
    "end-to-end encrypted",
    "messages and calls",
    "you were added",
    "changed the subject",
    "changed the group",
    "changed this group",
    "created group",
    "security code changed",
    "this message was deleted",
    "you deleted this message",
    "missed voice call",
    "missed video call",
    "disappearing messages",
    "turned on disappearing",
    "turned off disappearing",
    "joined using",
    "waiting for this message",
    "message timer",
    "blocked this contact",
    "unblocked this contact",
    "business account",
    "your security code",
    "you changed this group",
    "this chat is with a business",
    "tap for more info",
    // Hebrew system strings
    "הודעות ושיחות",
    "מוצפנות מקצה",
    "הוספת",
    "שינה את",
    "שינתה את",
    "יצר את הקבוצה",
    "יצרה את הקבוצה",
    "קוד האבטחה השתנה",
    "הודעה זו נמחקה",
    "מחקת הודעה זו",
    "שיחת קול שלא נענתה",
    "שיחת וידאו שלא נענתה",
    "הודעות נעלמות",
    "הפעיל הודעות נעלמות",
    "הפעילה הודעות נעלמות",
    "כיבה הודעות נעלמות",
    "כיבתה הודעות נעלמות",
    "ממתין להודעה זו",
    "חשבון עסקי",
    "הקש למידע נוסף",
    "קוד האבטחה שלך",
  ];

  return systemPatterns.some((p) => lower.includes(p));
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

/** Filter out system-generated messages even when they have a real author */
function isSystemMessage(message: string): boolean {
  const lower = message.toLowerCase();

  // Exact matches for very short system messages
  const exactMatches = ["left", "עזב", "עזבה"];
  if (exactMatches.includes(lower.trim())) return true;

  const patterns = [
    // English
    " added ",
    " removed ",
    " left the group",
    "joined using this group",
    "changed the subject",
    "changed the group",
    "changed this group",
    "created group",
    "you're now an admin",
    "is no longer an admin",
    "turned on disappearing",
    "turned off disappearing",
    "was added",
    "was removed",
    // Hebrew
    "הוסיף את",
    "הוסיפה את",
    "הוסיף/ה את",
    "הוסר/ה",
    "הוסר מהקבוצה",
    "הוסרה מהקבוצה",
    "הצטרף באמצעות",
    "הצטרפה באמצעות",
    "עזב את הקבוצה",
    "עזבה את הקבוצה",
    "שינה את נושא",
    "שינתה את נושא",
    "שינה את סמל",
    "שינתה את סמל",
    "את/ה מנהל/ת עכשיו",
    "כבר לא מנהל",
    "הפעיל הודעות נעלמות",
    "הפעילה הודעות נעלמות",
    "כיבה הודעות נעלמות",
    "כיבתה הודעות נעלמות",
    "הוזמן/ה לקבוצה",
    "צורף/ה לקבוצה",
    "הצטרף/ה באמצעות",
  ];

  return patterns.some((p) => lower.includes(p));
}

export function isMediaMessage(message: string): boolean {
  return (
    message === "<Media omitted>" ||
    message.includes("<attached:") ||
    message.includes("(file attached)")
  );
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
