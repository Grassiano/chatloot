"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { useGame } from "@/hooks/use-game";
import { Confetti } from "@/components/ui/confetti";
import { hapticCelebration } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { shareResults } from "@/lib/share";
import { Superlatives } from "./superlatives";

interface FinalResultsProps {
  game: ReturnType<typeof useGame>;
  memberPhotos?: Map<string, string>;
  groupName?: string | null;
  onNewGame?: () => void;
}

export function FinalResults({ game, memberPhotos, groupName, onNewGame }: FinalResultsProps) {
  const { state } = game;
  const { players, roundResults, settings } = state;
  const [showConfetti, setShowConfetti] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared" | "copied" | "failed">("idle");

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  // Fire confetti + haptics on mount (winner reveal)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
      hapticCelebration();
      playSound("celebration");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
      <Confetti active={showConfetti} count={80} duration={4000} />

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
                      {stats.correct}/{stats.total} נכונות · {stats.accuracy}% דיוק · {stats.avgTime} שנ׳ ממוצע
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

        {/* Superlatives */}
        <div className="mt-6">
          <Superlatives roundResults={roundResults} players={players} />
        </div>

        {/* Share button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-6 w-full max-w-lg"
        >
          <button
            onClick={async () => {
              if (shareStatus === "sharing" || !winner) return;
              setShareStatus("sharing");
              const result = await shareResults({
                winner: { name: winner.name, score: winner.score },
                leaderboard: sorted.map((p, i) => ({
                  name: p.name,
                  score: p.score,
                  rank: i + 1,
                })),
                groupName: groupName ?? null,
                totalRounds: settings.totalRounds,
              });
              setShareStatus(result);
              if (result !== "failed") {
                setTimeout(() => setShareStatus("idle"), 3000);
              }
            }}
            disabled={shareStatus === "sharing"}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00A884]/30 bg-[#00A884]/10 py-3.5 text-[15px] font-bold text-[#00A884] backdrop-blur-md transition-all hover:border-[#00A884]/50 hover:bg-[#00A884]/20 active:scale-[0.98] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {shareStatus === "sharing" && "יוצר תמונה..."}
            {shareStatus === "shared" && "שותף בהצלחה!"}
            {shareStatus === "copied" && "הועתק ללוח!"}
            {shareStatus === "failed" && "השיתוף נכשל"}
            {shareStatus === "idle" && "שתפו תוצאות"}
          </button>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-4 flex w-full max-w-lg gap-3"
        >
          <button
            onClick={onNewGame ?? game.reset}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 text-[15px] font-bold text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
          >
            צ׳אט חדש
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
