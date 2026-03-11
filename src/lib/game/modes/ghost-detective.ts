import type { ParsedChat } from "@/lib/parser/types";
import type { GhostDetectiveQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

export function generateGhostDetectiveQuestions(
  chat: ParsedChat,
  count: number
): GhostDetectiveQuestion[] {
  const questions: GhostDetectiveQuestion[] = [];
  const memberNames = chat.members.map((m) => m.displayName);
  if (memberNames.length < 2) return [];

  // Find members with significant ghost periods
  const ghosts: Array<{
    name: string;
    days: number;
  }> = [];

  for (const member of chat.members) {
    const stats = chat.stats.members.get(member.displayName);
    if (!stats || stats.longestGhostDays < 7) continue;

    ghosts.push({
      name: member.displayName,
      days: stats.longestGhostDays,
    });
  }

  // Need at least 2 members with ghost periods for meaningful questions
  if (ghosts.length < 2) return [];

  const shuffled = shuffleArray([...ghosts]);

  for (const ghost of shuffled) {
    if (questions.length >= count) break;

    const distractors = shuffleArray(
      memberNames.filter((n) => n !== ghost.name)
    ).slice(0, 3);

    const options = shuffleArray([...distractors, ghost.name]);

    questions.push({
      type: "ghost_detective",
      prompt: `מי נעלם מהקבוצה ל-${ghost.days} ימים?`,
      ghostDays: ghost.days,
      correctAnswer: ghost.name,
      options,
      gmNote: `${ghost.days} ימים בלי הודעה אחת`,
    });
  }

  return questions;
}
