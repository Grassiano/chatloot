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
 * Uses weighted stratified sampling — interesting messages get priority.
 */
export function sampleMessagesForAnalysis(
  chat: ParsedChat
): IndexedMessage[] {
  const eligible = chat.messages.filter((msg) => {
    if (!msg.author) return false;
    if (msg.meta.isDeleted || msg.meta.isForwarded) return false;
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

  // Assign weights based on message metadata
  const weighted = eligible.map((msg) => {
    let weight = 1;
    if (msg.meta.isEdited) weight += 1; // they cared enough to fix it
    if (msg.meta.hasQuestion) weight += 0.5; // questions are engaging
    // Conversation starters (not consecutive = after a gap)
    if (!msg.meta.isConsecutive) weight += 0.5;
    // Longer messages tend to be more interesting for the game
    if (msg.message.length > 50) weight += 0.5;
    return { msg, weight };
  });

  // Stratified sampling by author with weighted selection
  const byAuthor = new Map<string, Array<{ msg: ParsedMessage; weight: number }>>();
  for (const item of weighted) {
    const author = item.msg.author!;
    const list = byAuthor.get(author) ?? [];
    list.push(item);
    byAuthor.set(author, list);
  }

  const perAuthor = Math.max(5, Math.floor(MAX_MESSAGES / byAuthor.size));
  const result: ParsedMessage[] = [];

  for (const [, items] of byAuthor) {
    // Sort by weight descending, then take top + some random for variety
    const sorted = [...items].sort((a, b) => b.weight - a.weight);
    const topHalf = Math.ceil(perAuthor * 0.6);
    const randomHalf = perAuthor - topHalf;

    // Take top weighted messages
    const picks = sorted.slice(0, topHalf).map((i) => i.msg);

    // Add some random ones for variety
    const remaining = sorted.slice(topHalf);
    const randomPicks = shuffleArray(remaining)
      .slice(0, randomHalf)
      .map((i) => i.msg);

    result.push(...picks, ...randomPicks);
  }

  // Fill remaining slots with weighted random picks
  if (result.length < MAX_MESSAGES) {
    const used = new Set(result);
    const remaining = weighted.filter((i) => !used.has(i.msg));
    remaining.sort((a, b) => b.weight - a.weight);
    const extra = remaining.slice(0, MAX_MESSAGES - result.length).map((i) => i.msg);
    result.push(...extra);
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
