"use client";

import { motion } from "framer-motion";
import type { useGame } from "@/hooks/use-game";

interface FinalResultsProps {
  game: ReturnType<typeof useGame>;
  memberPhotos?: Map<string, string>;
}

export function FinalResults({ game, memberPhotos }: FinalResultsProps) {
  const { state } = game;
  const { players, roundResults, settings } = state;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  // Calculate stats per player
  function getPlayerStats(playerId: string) {
    let correct = 0;
    let totalTime = 0;
    let answered = 0;

    for (const result of roundResults) {
      const answer = result.answers.get(playerId);
      if (answer) {
        answered++;
        totalTime += answer.timeMs;
        if (answer.isCorrect) correct++;
      }
    }

    return {
      correct,
      total: roundResults.length,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
      avgTime: answered > 0 ? Math.round(totalTime / answered / 1000 * 10) / 10 : 0,
    };
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col bg-[radial-gradient(ellipse_at_top,#1a1a2e,#0A0A0F)] text-white">
      <div className="flex flex-1 flex-col items-center px-4 py-8">
        {/* Title */}
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 text-[14px] font-medium text-[#8B949E]"
        >
          {settings.totalRounds} סיבובים הסתיימו!
        </motion.p>

        {/* Winner announcement */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 12,
              delay: 0.3,
            }}
            className="mb-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mb-3 text-[48px]"
            >
              👑
            </motion.div>
            <p className="text-[13px] text-[#8B949E]">המנצח/ת הגדול/ה</p>
            <p
              className="mt-1 text-[32px] font-black"
              style={{ color: winner.color }}
            >
              {winner.name}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-1 text-[20px] font-bold tabular-nums text-[#F5C542]"
            >
              {winner.score} נקודות
            </motion.p>
          </motion.div>
        )}

        {/* Full leaderboard */}
        <div className="w-full max-w-lg space-y-2">
          {sorted.map((player, rank) => {
            const stats = getPlayerStats(player.id);
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + rank * 0.1 }}
                className={`rounded-xl px-4 py-3 ${
                  rank === 0
                    ? "border border-[#F5C542]/30 bg-[#F5C542]/10 shadow-[0_0_20px_rgba(245,197,66,0.15)] backdrop-blur-lg"
                    : "border border-white/10 bg-white/5 backdrop-blur-md"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-[18px] font-black text-[#8B949E]">
                    {rank === 0 ? "👑" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
                  </span>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.avatar}
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] font-medium">{player.name}</span>
                    <p className="text-[12px] text-[#8B949E]">
                      {stats.correct}/{stats.total} נכונות · {stats.accuracy}% דיוק · {stats.avgTime}s ממוצע
                    </p>
                  </div>
                  <span className="text-[18px] font-bold tabular-nums text-[#F5C542]">
                    {player.score}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex w-full max-w-lg gap-3"
        >
          <button
            onClick={game.reset}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 text-[15px] font-bold text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
          >
            משחק חדש
          </button>
          <button
            onClick={game.restartGame}
            className="flex-1 rounded-xl bg-[#F5C542] py-4 text-[15px] font-bold text-[#0A0A0F] shadow-[0_4px_20px_rgba(245,197,66,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            שחק שוב 🔄
          </button>
        </motion.div>
      </div>
    </div>
  );
}
