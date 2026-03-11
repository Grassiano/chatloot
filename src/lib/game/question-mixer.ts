import type { ParsedChat } from "@/lib/parser/types";
import type { GameQuestion, WhoSaidItQuestion } from "./types";
import { generateWhoSaidItQuestions } from "./modes/who-said-it";
import { generateStatTriviaQuestions } from "./modes/stat-trivia";
import { generateEmojiMatchQuestions } from "./modes/emoji-match";
import { generateTrueFalseQuestions } from "./modes/true-false";
import { shuffleArray } from "@/lib/utils";

/**
 * Generate a mixed set of questions for a game.
 * Distribution: ~60% who-said-it, ~15% stats, ~10% emoji, ~15% true/false.
 * Ensures no two non-who-said-it questions appear in a row.
 */
export function generateMixedQuestions(
  chat: ParsedChat,
  totalRounds: number,
  aiQuestions?: WhoSaidItQuestion[]
): GameQuestion[] {
  // Generate pool of each type
  const whoSaidIt =
    aiQuestions && aiQuestions.length > 0
      ? aiQuestions
      : generateWhoSaidItQuestions(chat, totalRounds);

  const statTrivia = generateStatTriviaQuestions(chat, 3);
  const emojiMatch = generateEmojiMatchQuestions(chat, 2);
  const trueFalse = generateTrueFalseQuestions(chat, 3);

  // Calculate how many of each type to include
  const specialCount = Math.min(
    Math.floor(totalRounds * 0.4), // max 40% special
    statTrivia.length + emojiMatch.length + trueFalse.length
  );
  const whoSaidItCount = totalRounds - specialCount;

  // Pick who-said-it questions
  const selectedWhoSaidIt = whoSaidIt.slice(0, whoSaidItCount);

  // Pick special questions (round-robin from available pools)
  const specialPool: GameQuestion[] = shuffleArray([
    ...statTrivia,
    ...emojiMatch,
    ...trueFalse,
  ]);
  const selectedSpecial = specialPool.slice(0, specialCount);

  // Interleave: place special questions at strategic positions
  // Never two specials in a row
  const result: GameQuestion[] = [];
  let specialIdx = 0;
  let whoIdx = 0;
  let lastWasSpecial = false;

  for (let i = 0; i < totalRounds; i++) {
    const shouldInsertSpecial =
      !lastWasSpecial &&
      specialIdx < selectedSpecial.length &&
      // Place specials every 2-3 rounds, but not first or last
      i > 0 &&
      i < totalRounds - 1 &&
      (i % 3 === 2 || // every 3rd round
        (whoIdx >= selectedWhoSaidIt.length && specialIdx < selectedSpecial.length));

    if (shouldInsertSpecial) {
      result.push(selectedSpecial[specialIdx]);
      specialIdx++;
      lastWasSpecial = true;
    } else if (whoIdx < selectedWhoSaidIt.length) {
      result.push(selectedWhoSaidIt[whoIdx]);
      whoIdx++;
      lastWasSpecial = false;
    } else if (specialIdx < selectedSpecial.length) {
      result.push(selectedSpecial[specialIdx]);
      specialIdx++;
      lastWasSpecial = true;
    }
  }

  // If we're short, pad with remaining who-said-it
  while (result.length < totalRounds && whoIdx < whoSaidIt.length) {
    result.push(whoSaidIt[whoIdx]);
    whoIdx++;
  }

  return result.slice(0, totalRounds);
}
