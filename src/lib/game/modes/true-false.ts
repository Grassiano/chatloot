import type { ParsedChat } from "@/lib/parser/types";
import type { TrueFalseQuestion } from "../types";
import { shuffleArray } from "@/lib/utils";

interface TFTemplate {
  generate: (
    chat: ParsedChat
  ) => { statement: string; isTrue: boolean; gmNote?: string } | null;
}

const HEBREW_DAYS: Record<string, string> = {
  Sunday: "ראשון",
  Monday: "שני",
  Tuesday: "שלישי",
  Wednesday: "רביעי",
  Thursday: "חמישי",
  Friday: "שישי",
  Saturday: "שבת",
};

const TEMPLATES: TFTemplate[] = [
  // Message count threshold
  {
    generate: (chat) => {
      const members = [...chat.stats.members.entries()];
      if (members.length === 0) return null;

      const [name, stats] = members[Math.floor(Math.random() * members.length)];
      // Round to nearest nice number
      const rounded =
        stats.totalMessages > 100
          ? Math.round(stats.totalMessages / 100) * 100
          : Math.round(stats.totalMessages / 10) * 10;

      const isTrue = stats.totalMessages >= rounded;
      return {
        statement: `${name} שלח/ה יותר מ-${rounded} הודעות`,
        isTrue,
      };
    },
  },
  // Most active day
  {
    generate: (chat) => {
      const members = [...chat.stats.members.entries()];
      if (members.length === 0) return null;

      const [name, stats] = members[Math.floor(Math.random() * members.length)];
      const actualDay = HEBREW_DAYS[stats.mostActiveDay] ?? stats.mostActiveDay;

      // 50% chance: show the real day (true) or a random wrong day (false)
      if (Math.random() > 0.5) {
        return {
          statement: `${name} הכי פעיל/ה ביום ${actualDay}`,
          isTrue: true,
        };
      }

      const allDays = Object.values(HEBREW_DAYS);
      const wrongDay =
        allDays.filter((d) => d !== actualDay)[
          Math.floor(Math.random() * (allDays.length - 1))
        ];

      return {
        statement: `${name} הכי פעיל/ה ביום ${wrongDay}`,
        isTrue: false,
        gmNote: `בעצם ביום ${actualDay}`,
      };
    },
  },
  // Night owl comparison
  {
    generate: (chat) => {
      const members = [...chat.stats.members.entries()].filter(
        ([, s]) => s.nightMessages > 3
      );
      if (members.length < 2) return null;

      const sorted = members.sort((a, b) => b[1].nightMessages - a[1].nightMessages);
      const [topName] = sorted[0];
      const [secondName] = sorted[1];

      // True statement: top > second
      if (Math.random() > 0.5) {
        return {
          statement: `${topName} שולח/ת יותר הודעות בלילה מ-${secondName}`,
          isTrue: true,
          gmNote: `${sorted[0][1].nightMessages} מול ${sorted[1][1].nightMessages}`,
        };
      }

      // False statement: second > top
      return {
        statement: `${secondName} שולח/ת יותר הודעות בלילה מ-${topName}`,
        isTrue: false,
        gmNote: `בדיוק הפוך!`,
      };
    },
  },
  // Emoji count
  {
    generate: (chat) => {
      const members = [...chat.stats.members.entries()].filter(
        ([, s]) => s.emojiCount > 10
      );
      if (members.length === 0) return null;

      const [name, stats] = members[Math.floor(Math.random() * members.length)];
      const threshold = Math.round(stats.emojiCount / 50) * 50 || 50;
      const isTrue = stats.emojiCount >= threshold;

      return {
        statement: `${name} שלח/ה יותר מ-${threshold} אימוג׳ים`,
        isTrue,
      };
    },
  },
];

export function generateTrueFalseQuestions(
  chat: ParsedChat,
  count: number
): TrueFalseQuestion[] {
  const questions: TrueFalseQuestion[] = [];
  const shuffledTemplates = shuffleArray([...TEMPLATES]);

  // Try each template, cycle if needed
  for (let attempt = 0; attempt < count * 3 && questions.length < count; attempt++) {
    const template = shuffledTemplates[attempt % shuffledTemplates.length];
    const result = template.generate(chat);
    if (!result) continue;

    // Avoid duplicate statements
    if (questions.some((q) => q.statement === result.statement)) continue;

    questions.push({
      type: "true_false",
      statement: result.statement,
      isTrue: result.isTrue,
      correctAnswer: result.isTrue ? "נכון" : "לא נכון",
      options: ["נכון", "לא נכון"],
      gmNote: result.gmNote,
    });
  }

  return questions;
}
