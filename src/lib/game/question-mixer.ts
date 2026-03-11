import type { ParsedChat } from "@/lib/parser/types";
import type { GameQuestion, WhoSaidItQuestion } from "./types";
import { generateWhoSaidItQuestions } from "./modes/who-said-it";
import { generateStatTriviaQuestions } from "./modes/stat-trivia";
import { generateEmojiMatchQuestions } from "./modes/emoji-match";
import { generateTrueFalseQuestions } from "./modes/true-false";
import { generateWordCloudQuestions } from "./modes/word-cloud";
import { generateTimeGuessQuestions } from "./modes/time-guess";
import { generateGhostDetectiveQuestions } from "./modes/ghost-detective";
import { shuffleArray } from "@/lib/utils";

/**
 * Generate a mixed set of questions for a game.
 * Distribution: ~50% who-said-it, ~20% stat trivia, ~10% true/false,
 * ~20% variety (emoji, word cloud, time guess, ghost detective).
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
  const trueFalse = generateTrueFalseQuestions(chat, 2);
  const wordCloud = generateWordCloudQuestions(chat, 2);
  const timeGuess = generateTimeGuessQuestions(chat, 2);
  const ghostDetective = generateGhostDetectiveQuestions(chat, 1);

  // Variety pool: rotate through different special types
  const varietyPool: GameQuestion[] = shuffleArray([
    ...emojiMatch,
    ...wordCloud,
    ...timeGuess,
    ...ghostDetective,
  ]);

  // Calculate how many of each type to include
  const allSpecial: GameQuestion[] = [
    ...statTrivia,
    ...trueFalse,
    ...varietyPool,
  ];

  const specialCount = Math.min(
    Math.floor(totalRounds * 0.5), // max 50% special
    allSpecial.length
  );
  const whoSaidItCount = totalRounds - specialCount;

  // Pick who-said-it questions
  const selectedWhoSaidIt = whoSaidIt.slice(0, whoSaidItCount);

  // Pick special questions — prioritize diversity of types
  const selectedSpecial: GameQuestion[] = [];
  const usedTypes = new Set<string>();

  // First pass: one of each type
  for (const q of allSpecial) {
    if (selectedSpecial.length >= specialCount) break;
    if (!usedTypes.has(q.type)) {
      selectedSpecial.push(q);
      usedTypes.add(q.type);
    }
  }

  // Second pass: fill remaining from shuffled pool
  const remaining = shuffleArray(
    allSpecial.filter((q) => !selectedSpecial.includes(q))
  );
  for (const q of remaining) {
    if (selectedSpecial.length >= specialCount) break;
    selectedSpecial.push(q);
  }

  // Interleave: place special questions at strategic positions
  // Never two specials in a row
  const shuffledSpecial = shuffleArray(selectedSpecial);
  const result: GameQuestion[] = [];
  let specialIdx = 0;
  let whoIdx = 0;
  let lastWasSpecial = false;

  for (let i = 0; i < totalRounds; i++) {
    const shouldInsertSpecial =
      !lastWasSpecial &&
      specialIdx < shuffledSpecial.length &&
      // Place specials every 2-3 rounds, but not first or last
      i > 0 &&
      i < totalRounds - 1 &&
      (i % 3 === 2 || // every 3rd round
        (whoIdx >= selectedWhoSaidIt.length && specialIdx < shuffledSpecial.length));

    if (shouldInsertSpecial) {
      result.push(shuffledSpecial[specialIdx]);
      specialIdx++;
      lastWasSpecial = true;
    } else if (whoIdx < selectedWhoSaidIt.length) {
      result.push(selectedWhoSaidIt[whoIdx]);
      whoIdx++;
      lastWasSpecial = false;
    } else if (specialIdx < shuffledSpecial.length) {
      result.push(shuffledSpecial[specialIdx]);
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
