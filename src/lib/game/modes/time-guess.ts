import type { ParsedChat } from "@/lib/parser/types";
import type { TimeGuessQuestion } from "../types";
import { isMediaMessage, isSystemMessage } from "@/lib/parser/parse-chat";
import { shuffleArray } from "@/lib/utils";

const TIME_SLOTS = [
  { label: "בלילה (00:00-05:00)", min: 0, max: 4 },
  { label: "בבוקר (05:00-12:00)", min: 5, max: 11 },
  { label: "אחה״צ (12:00-18:00)", min: 12, max: 17 },
  { label: "בערב (18:00-00:00)", min: 18, max: 23 },
];

function getTimeSlot(hour: number): string {
  const slot = TIME_SLOTS.find((s) => hour >= s.min && hour <= s.max);
  return slot?.label ?? TIME_SLOTS[3].label;
}

export function generateTimeGuessQuestions(
  chat: ParsedChat,
  count: number
): TimeGuessQuestion[] {
  const questions: TimeGuessQuestion[] = [];

  // Find messages sent at unusual hours (night/early morning = most surprising)
  const eligible = chat.messages.filter((m) => {
    if (!m.author) return false;
    if (isMediaMessage(m.message)) return false;
    if (isSystemMessage(m.message)) return false;
    if (m.meta.isDeleted || m.meta.isForwarded) return false;
    if (m.message.length < 10 || m.message.length > 150) return false;
    if (m.message.startsWith("http")) return false;
    return true;
  });

  if (eligible.length < 10) return [];

  // Prefer messages at unusual times (night gets highest priority, early morning next)
  const scored = eligible.map((m) => {
    const hour = m.date.getHours();
    let score = 0;
    if (hour >= 0 && hour < 5) score = 3; // night — most surprising
    else if (hour >= 5 && hour < 7) score = 2; // very early morning
    else score = 1;
    return { msg: m, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and shuffle within same score
  const top = scored.slice(0, Math.min(30, scored.length));
  const shuffled = shuffleArray(top);

  const allSlotLabels = TIME_SLOTS.map((s) => s.label);

  for (const { msg } of shuffled) {
    if (questions.length >= count) break;

    const hour = msg.date.getHours();
    const correctSlot = getTimeSlot(hour);

    // Options: all 4 time slots, shuffled
    const options = shuffleArray([...allSlotLabels]);

    questions.push({
      type: "time_guess",
      prompt: "מתי נשלחה ההודעה הזאת?",
      messageText: msg.message,
      messageAuthor: msg.author!,
      correctAnswer: correctSlot,
      options,
      gmNote: `${String(hour).padStart(2, "0")}:${String(msg.date.getMinutes()).padStart(2, "0")}`,
    });
  }

  return questions;
}
