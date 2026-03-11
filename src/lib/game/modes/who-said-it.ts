import type { ParsedChat, ParsedMessage } from "@/lib/parser/types";
import { isSystemMessage } from "@/lib/parser/parse-chat";
import type { WhoSaidItQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

/**
 * Generate questions for "Who Said It?" mode.
 * Picks interesting messages and creates multiple-choice questions.
 */
export function generateWhoSaidItQuestions(
  chat: ParsedChat,
  count: number
): WhoSaidItQuestion[] {
  const eligibleMessages = getEligibleMessages(chat);

  if (eligibleMessages.length === 0) {
    throw new Error("no_eligible_messages");
  }

  // Shuffle and pick
  const shuffled = shuffleArray(eligibleMessages);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const memberNames = chat.members.map((m) => m.displayName);

  return selected.map((msg) =>
    createQuestion(msg, memberNames)
  );
}

function getEligibleMessages(chat: ParsedChat): ParsedMessage[] {
  return chat.messages.filter((msg) => {
    // Must have an author (not a system message)
    if (!msg.author) return false;

    // Skip media placeholders
    if (
      msg.message === "<Media omitted>" ||
      msg.message.includes("<attached:") ||
      msg.message.includes("(file attached)")
    )
      return false;

    // Must be a decent length to be guessable
    if (msg.message.length < 8) return false;

    // Skip very long messages (walls of text aren't fun)
    if (msg.message.length > 300) return false;

    // Safety net: skip system messages that slipped through parsing
    if (isSystemMessage(msg.message)) return false;

    // Skip messages that are just links
    if (
      msg.message.startsWith("http://") ||
      msg.message.startsWith("https://")
    )
      return false;

    // Skip messages that are just emojis (too short/easy)
    const withoutEmoji = msg.message.replace(
      /[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu,
      ""
    ).trim();
    if (withoutEmoji.length < 5) return false;

    return true;
  });
}

function createQuestion(
  msg: ParsedMessage,
  allMembers: string[]
): WhoSaidItQuestion {
  const correctAuthor = msg.author!;

  // Pick 3 distractors (other members who didn't say this)
  const otherMembers = allMembers.filter((m) => m !== correctAuthor);
  const distractors = shuffleArray(otherMembers).slice(0, 3);

  // If we don't have enough members for 4 options, pad with what we have
  while (distractors.length < 3 && otherMembers.length > 0) {
    distractors.push(otherMembers[distractors.length % otherMembers.length]);
  }

  // Combine and shuffle options
  const options = shuffleArray([correctAuthor, ...distractors]);

  return {
    type: "who_said_it" as const,
    messageText: msg.message,
    correctAuthor,
    correctAnswer: correctAuthor,
    options,
    timestamp: msg.date,
  };
}
