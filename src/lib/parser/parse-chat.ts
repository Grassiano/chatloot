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

  for (const msg of rawMessages) {
    if (!msg.author) continue; // skip system messages

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

  // Try to extract group name from system messages
  const groupName = extractGroupName(rawMessages);

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
  }

  return null;
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
