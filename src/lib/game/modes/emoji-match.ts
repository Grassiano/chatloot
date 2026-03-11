import type { ParsedChat } from "@/lib/parser/types";
import { asMap } from "@/lib/parser/types";
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
  const memberStats = asMap(chat.stats.members);

  const membersWithEmojis: Array<{
    name: string;
    topEmoji: string;
    count: number;
  }> = [];

  for (const member of chat.members) {
    const stats = memberStats.get(member.displayName);
    if (!stats || stats.topEmojis.length === 0) continue;
    membersWithEmojis.push({
      name: member.displayName,
      topEmoji: stats.topEmojis[0].emoji,
      count: stats.topEmojis[0].count,
    });
  }

  if (membersWithEmojis.length < 2) return [];

  // Shuffle and generate questions — alternate between two types
  const shuffled = shuffleArray([...membersWithEmojis]);

  for (let i = 0; i < shuffled.length && questions.length < count; i++) {
    const member = shuffled[i];

    if (i % 2 === 0) {
      // Type 1: "Who uses X emoji the most?" — member name options
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
    } else {
      // Type 2: "What's X's most used emoji?" — emoji options
      const stats = memberStats.get(member.name);
      if (!stats || stats.topEmojis.length === 0) continue;

      const correctEmoji = stats.topEmojis[0].emoji;

      // Collect other members' top emojis as distractors
      const otherEmojis = membersWithEmojis
        .filter((m) => m.name !== member.name && m.topEmoji !== correctEmoji)
        .map((m) => m.topEmoji);

      // Need at least 3 distractors
      if (otherEmojis.length < 3) continue;

      const distractorEmojis = shuffleArray(otherEmojis).slice(0, 3);
      const options = shuffleArray([...distractorEmojis, correctEmoji]);

      questions.push({
        type: "emoji_match",
        prompt: `מה האימוג׳י הכי נפוץ של ${member.name}?`,
        targetMember: member.name,
        correctAnswer: correctEmoji,
        options,
        gmNote: `${member.count} פעמים!`,
      });
    }
  }

  return questions;
}
