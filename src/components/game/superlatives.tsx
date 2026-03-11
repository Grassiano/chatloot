"use client";

import { motion } from "framer-motion";
import type { RoundResult, Player } from "@/lib/game/types";

interface SuperlativesProps {
  roundResults: RoundResult[];
  players: Player[];
}

interface Award {
  emoji: string;
  title: string;
  winner: string;
  detail: string;
}

export function Superlatives({ roundResults, players }: SuperlativesProps) {
  const awards = computeAwards(roundResults, players);
  if (awards.length === 0) return null;

  return (
    <div className="w-full max-w-lg">
      <p className="mb-3 text-center text-[13px] font-medium text-[#8B949E]">
        פרסים מיוחדים
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {awards.map((award, i) => (
          <motion.div
            key={award.title}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15 }}
            className="flex min-w-[140px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md"
          >
            <span className="text-[28px]">{award.emoji}</span>
            <span className="text-[12px] font-bold text-[#F5C542]">
              {award.title}
            </span>
            <span className="text-[14px] font-medium text-white">
              {award.winner}
            </span>
            <span className="text-[11px] text-[#8B949E]">
              {award.detail}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function computeAwards(roundResults: RoundResult[], players: Player[]): Award[] {
  if (roundResults.length === 0 || players.length === 0) return [];

  const awards: Award[] = [];
  const playerStats = new Map<
    string,
    {
      name: string;
      correct: number;
      totalTime: number;
      correctTime: number;
      correctCount: number;
      streak: number;
      maxStreak: number;
      answered: number;
    }
  >();

  for (const p of players) {
    playerStats.set(p.id, {
      name: p.name,
      correct: 0,
      totalTime: 0,
      correctTime: 0,
      correctCount: 0,
      streak: 0,
      maxStreak: 0,
      answered: 0,
    });
  }

  // Per-question stats
  const questionCorrectRate: Array<{ roundNum: number; correctCount: number; total: number }> = [];

  for (const result of roundResults) {
    let qCorrect = 0;
    let qTotal = 0;

    for (const [playerId, answer] of result.answers) {
      const stats = playerStats.get(playerId);
      if (!stats) continue;
      stats.answered++;
      stats.totalTime += answer.timeMs;

      if (answer.isCorrect) {
        stats.correct++;
        stats.correctTime += answer.timeMs;
        stats.correctCount++;
        stats.streak++;
        if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
        qCorrect++;
      } else {
        stats.streak = 0;
      }
      qTotal++;
    }

    questionCorrectRate.push({
      roundNum: result.roundNumber,
      correctCount: qCorrect,
      total: qTotal,
    });
  }

  // Fastest (lowest avg correct time)
  let fastest: { name: string; avgMs: number } | null = null;
  for (const stats of playerStats.values()) {
    if (stats.correctCount >= 2) {
      const avg = stats.correctTime / stats.correctCount;
      if (!fastest || avg < fastest.avgMs) {
        fastest = { name: stats.name, avgMs: avg };
      }
    }
  }
  if (fastest) {
    awards.push({
      emoji: "⚡",
      title: "הכי מהיר",
      winner: fastest.name,
      detail: `${(fastest.avgMs / 1000).toFixed(1)} שנ׳ ממוצע`,
    });
  }

  // Best streak
  let bestStreak: { name: string; streak: number } | null = null;
  for (const stats of playerStats.values()) {
    if (stats.maxStreak >= 3 && (!bestStreak || stats.maxStreak > bestStreak.streak)) {
      bestStreak = { name: stats.name, streak: stats.maxStreak };
    }
  }
  if (bestStreak) {
    awards.push({
      emoji: "🔥",
      title: "סטריקר",
      winner: bestStreak.name,
      detail: `${bestStreak.streak} ברצף`,
    });
  }

  // Best accuracy (if different from overall winner)
  let bestAccuracy: { name: string; pct: number } | null = null;
  for (const stats of playerStats.values()) {
    if (stats.answered >= 3) {
      const pct = stats.correct / stats.answered;
      if (!bestAccuracy || pct > bestAccuracy.pct) {
        bestAccuracy = { name: stats.name, pct };
      }
    }
  }
  if (bestAccuracy) {
    awards.push({
      emoji: "🎯",
      title: "מומחה",
      winner: bestAccuracy.name,
      detail: `${Math.round(bestAccuracy.pct * 100)}% דיוק`,
    });
  }

  // Hardest question (lowest correct rate)
  const hardest = questionCorrectRate
    .filter((q) => q.total >= 2)
    .sort((a, b) => a.correctCount / a.total - b.correctCount / b.total)[0];
  if (hardest && hardest.correctCount / hardest.total <= 0.5) {
    const pct = Math.round((hardest.correctCount / hardest.total) * 100);
    awards.push({
      emoji: "🧠",
      title: "השאלה הקשה",
      winner: `סיבוב ${hardest.roundNum}`,
      detail: pct === 0 ? "אף אחד לא צדק" : `רק ${pct}% צדקו`,
    });
  }

  return awards.slice(0, 4);
}
