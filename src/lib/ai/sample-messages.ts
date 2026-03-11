import type { ParsedChat, ParsedMessage } from "@/lib/parser/types";
import { shuffleArray } from "@/lib/utils";

const MAX_MESSAGES = 200;
const MIN_LENGTH = 8;
const MAX_LENGTH = 300;

export interface IndexedMessage {
  id: number;
  author: string;
  message: string;
  date: string;
}

/**
 * Filter eligible messages and sample ~200 for AI analysis.
 * Uses stratified sampling by author to ensure variety.
 */
export function sampleMessagesForAnalysis(
  chat: ParsedChat
): IndexedMessage[] {
  const eligible = chat.messages.filter((msg) => {
    if (!msg.author) return false;
    if (
      msg.message === "<Media omitted>" ||
      msg.message.includes("<attached:") ||
      msg.message.includes("(file attached)")
    )
      return false;
    if (msg.message.length < MIN_LENGTH || msg.message.length > MAX_LENGTH)
      return false;
    if (
      msg.message.startsWith("http://") ||
      msg.message.startsWith("https://")
    )
      return false;
    const withoutEmoji = msg.message
      .replace(
        /[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu,
        ""
      )
      .trim();
    if (withoutEmoji.length < 5) return false;
    return true;
  });

  if (eligible.length <= MAX_MESSAGES) {
    return eligible.map(toIndexed);
  }

  // Stratified sampling by author
  const byAuthor = new Map<string, ParsedMessage[]>();
  for (const msg of eligible) {
    const author = msg.author!;
    const list = byAuthor.get(author) ?? [];
    list.push(msg);
    byAuthor.set(author, list);
  }

  const perAuthor = Math.max(5, Math.floor(MAX_MESSAGES / byAuthor.size));
  const result: ParsedMessage[] = [];

  for (const [, messages] of byAuthor) {
    const shuffled = shuffleArray(messages);
    result.push(...shuffled.slice(0, perAuthor));
  }

  // Fill remaining slots with random picks
  if (result.length < MAX_MESSAGES) {
    const used = new Set(result);
    const remaining = eligible
      .filter((m) => !used.has(m));
    const shuffled = shuffleArray(remaining);
    result.push(...shuffled.slice(0, MAX_MESSAGES - result.length));
  }

  return shuffleArray(result).slice(0, MAX_MESSAGES).map(toIndexed);
}

function toIndexed(msg: ParsedMessage, idx: number): IndexedMessage {
  return {
    id: idx,
    author: msg.author!,
    message: msg.message,
    date: msg.date.toISOString(),
  };
}
