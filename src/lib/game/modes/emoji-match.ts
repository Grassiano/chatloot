import type { ParsedChat } from "@/lib/parser/types";
import type { EmojiMatchQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

export function generateEmojiMatchQuestions(
  chat: ParsedChat,
  count: number
): EmojiMatchQuestion[] {
  const questions: EmojiMatchQuestion[] = [];
  const memberNames = chat.members.map((m) => m.displayName);
  if (memberNames.length < 2) return [];

  // Collect members with top emojis
  const membersWithEmojis: Array<{
    name: string;
    topEmoji: string;
    count: number;
  }> = [];

  for (const member of chat.members) {
    const stats = chat.stats.members.get(member.displayName);
    if (!stats || stats.topEmojis.length === 0) continue;
    membersWithEmojis.push({
      name: member.displayName,
      topEmoji: stats.topEmojis[0].emoji,
      count: stats.topEmojis[0].count,
    });
  }

  if (membersWithEmojis.length < 2) return [];

  // Shuffle and generate questions
  const shuffled = shuffleArray([...membersWithEmojis]);

  for (const member of shuffled) {
    if (questions.length >= count) break;

    // Type 1: "Who uses X emoji the most?"
    const distractors = shuffleArray(
      memberNames.filter((n) => n !== member.name)
    ).slice(0, 3);

    const options = shuffleArray([...distractors, member.name]);

    questions.push({
      type: "emoji_match",
      prompt: `מי משתמש הכי הרבה ב-${member.topEmoji}?`,
      targetEmoji: member.topEmoji,
      correctAnswer: member.name,
      options,
      gmNote: `${member.count} פעמים!`,
    });
  }

  return questions;
}
