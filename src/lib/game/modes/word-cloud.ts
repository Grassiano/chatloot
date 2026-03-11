import type { ParsedChat } from "@/lib/parser/types";
import { asMap } from "@/lib/parser/types";
import type { WordCloudQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

export function generateWordCloudQuestions(
  chat: ParsedChat,
  count: number
): WordCloudQuestion[] {
  const questions: WordCloudQuestion[] = [];
  const memberNames = chat.members.map((m) => m.displayName);
  if (memberNames.length < 2) return [];

  // Collect members with distinctive top words
  const candidates: Array<{
    name: string;
    word: string;
    count: number;
  }> = [];

  const memberStats = asMap(chat.stats.members);

  // Build a global word→member map to find unique words
  const wordOwners = new Map<string, string[]>();

  for (const member of chat.members) {
    const stats = memberStats.get(member.displayName);
    if (!stats || stats.topWords.length === 0) continue;

    for (const tw of stats.topWords) {
      const owners = wordOwners.get(tw.word) ?? [];
      owners.push(member.displayName);
      wordOwners.set(tw.word, owners);
    }
  }

  // Pick members whose #1 word is unique to them (or at least rare)
  for (const member of chat.members) {
    const stats = memberStats.get(member.displayName);
    if (!stats || stats.topWords.length === 0) continue;

    // Find the most distinctive word (fewest other owners)
    const sorted = [...stats.topWords].sort((a, b) => {
      const aOwners = wordOwners.get(a.word)?.length ?? 0;
      const bOwners = wordOwners.get(b.word)?.length ?? 0;
      return aOwners - bOwners;
    });

    const best = sorted[0];
    if (best && best.count >= 5) {
      candidates.push({
        name: member.displayName,
        word: best.word,
        count: best.count,
      });
    }
  }

  if (candidates.length < 2) return [];

  const shuffled = shuffleArray([...candidates]);

  for (const candidate of shuffled) {
    if (questions.length >= count) break;

    // Avoid duplicate words
    if (questions.some((q) => q.targetWord === candidate.word)) continue;

    const distractors = shuffleArray(
      memberNames.filter((n) => n !== candidate.name)
    ).slice(0, 3);

    const options = shuffleArray([...distractors, candidate.name]);

    questions.push({
      type: "word_cloud",
      prompt: `של מי המילה הכי נפוצה: ״${candidate.word}״?`,
      targetWord: candidate.word,
      wordCount: candidate.count,
      correctAnswer: candidate.name,
      options,
      gmNote: `${candidate.count} פעמים!`,
    });
  }

  return questions;
}
