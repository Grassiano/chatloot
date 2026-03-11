import type { ParsedChat, MemberStats } from "@/lib/parser/types";
import { asMap } from "@/lib/parser/types";
import type { StatTriviaQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

interface StatCategory {
  prompt: string;
  getValue: (stats: MemberStats) => number;
  formatValue: (value: number) => string;
  gmNote?: string;
  /** Minimum value the winner must have for this to be interesting */
  minThreshold?: number;
}

const STAT_CATEGORIES: StatCategory[] = [
  {
    prompt: "מי שלח הכי הרבה הודעות?",
    getValue: (s) => s.totalMessages,
    formatValue: (v) => `${v.toLocaleString()} הודעות`,
    gmNote: "הכתבן הרשמי של הקבוצה",
  },
  {
    prompt: "מי כותב הכי ארוך?",
    getValue: (s) => s.averageMessageLength,
    formatValue: (v) => `ממוצע ${Math.round(v)} תווים`,
    gmNote: "מגילות שלמות בהודעה אחת",
    minThreshold: 20,
  },
  {
    prompt: "מי הכי פעיל בלילה?",
    getValue: (s) => s.nightMessages,
    formatValue: (v) => `${v} הודעות בין 00:00-05:00`,
    gmNote: "ינשוף הלילה של הקבוצה",
    minThreshold: 5,
  },
  {
    prompt: "מי שלח הכי הרבה אימוג׳ים?",
    getValue: (s) => s.emojiCount,
    formatValue: (v) => `${v.toLocaleString()} אימוג׳ים`,
    gmNote: "מלך האימוג׳ים 👑",
    minThreshold: 10,
  },
  {
    prompt: "מי שלח הכי הרבה מדיה?",
    getValue: (s) => s.mediaMessages,
    formatValue: (v) => `${v} קבצי מדיה`,
    gmNote: "הצלם הרשמי",
    minThreshold: 5,
  },
  {
    prompt: "מי הכי פעיל בבוקר?",
    getValue: (s) => s.morningMessages,
    formatValue: (v) => `${v} הודעות בין 05:00-12:00`,
    gmNote: "ציפור מוקדמת 🐦",
    minThreshold: 10,
  },
  {
    prompt: "מי שואל הכי הרבה שאלות?",
    getValue: (s) => s.questionCount,
    formatValue: (v) => `${v} שאלות`,
    gmNote: "סקרן כרוני",
    minThreshold: 10,
  },
  {
    prompt: "מי מחק הכי הרבה הודעות?",
    getValue: (s) => s.deletedCount,
    formatValue: (v) => `${v} הודעות`,
    gmNote: "מה הסתיר? 🤔",
    minThreshold: 3,
  },
  {
    prompt: "מי שולח הכי הרבה הודעות ברצף?",
    getValue: (s) => s.burstCount,
    formatValue: (v) => `${v} פעמים`,
    gmNote: "ספאמר מקצועי 🔥",
    minThreshold: 3,
  },
  {
    prompt: "מי מחיה צ׳אטים מתים?",
    getValue: (s) => s.conversationStarts,
    formatValue: (v) => `${v} פעמים`,
    gmNote: "מחיה המתים ⚡",
    minThreshold: 5,
  },
  {
    prompt: "מי שולח הכי הרבה לינקים?",
    getValue: (s) => s.linkCount,
    formatValue: (v) => `${v} לינקים`,
    gmNote: "מפיץ הלינקים 🔗",
    minThreshold: 5,
  },
  {
    prompt: "מי מעביר הכי הרבה הודעות?",
    getValue: (s) => s.forwardedCount,
    formatValue: (v) => `${v} הודעות`,
    gmNote: "שדרן הקבוצה 📡",
    minThreshold: 5,
  },
  {
    prompt: "מי הכי פעיל אחה״צ?",
    getValue: (s) => s.afternoonMessages,
    formatValue: (v) => `${v} הודעות בין 12:00-18:00`,
    gmNote: "הכי פרודוקטיבי",
    minThreshold: 10,
  },
  {
    prompt: "מי הכי פעיל בערב?",
    getValue: (s) => s.eveningMessages,
    formatValue: (v) => `${v} הודעות בין 18:00-00:00`,
    gmNote: "יצור הלילה 🌙",
    minThreshold: 10,
  },
  {
    prompt: "מי נעלם הכי הרבה זמן?",
    getValue: (s) => s.longestGhostDays,
    formatValue: (v) => `${v} ימים`,
    gmNote: "הנעלם הגדול 🕵️",
    minThreshold: 7,
  },
];

export function generateStatTriviaQuestions(
  chat: ParsedChat,
  count: number
): StatTriviaQuestion[] {
  const memberNames = chat.members.map((m) => m.displayName);
  if (memberNames.length < 2) return [];

  const memberStats = asMap(chat.stats.members);
  const questions: StatTriviaQuestion[] = [];

  // Shuffle categories and try each one
  const shuffled = shuffleArray([...STAT_CATEGORIES]);

  for (const category of shuffled) {
    if (questions.length >= count) break;

    // Find the winner for this category
    let winnerName = "";
    let winnerValue = -1;

    for (const member of chat.members) {
      const stats = memberStats.get(member.displayName);
      if (!stats) continue;

      const value = category.getValue(stats);
      if (value > winnerValue) {
        winnerValue = value;
        winnerName = member.displayName;
      }
    }

    // Skip if no clear winner or below threshold
    if (!winnerName || winnerValue <= 0) continue;
    if (category.minThreshold && winnerValue < category.minThreshold) continue;

    // Build options: winner + 3 random distractors
    const distractors = shuffleArray(
      memberNames.filter((n) => n !== winnerName)
    ).slice(0, 3);

    const options = shuffleArray([...distractors, winnerName]);

    questions.push({
      type: "stat_trivia",
      prompt: category.prompt,
      statValue: category.formatValue(winnerValue),
      correctAnswer: winnerName,
      options,
      gmNote: category.gmNote,
    });
  }

  return questions;
}
