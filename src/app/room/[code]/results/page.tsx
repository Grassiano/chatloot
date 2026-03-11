"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRoomContext } from "@/components/room/room-provider";
import { PlayerList } from "@/components/room/player-list";
import { getSessionId } from "@/lib/session";
import type { RoomPlayer } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { SparklesText } from "@/components/ui/sparkles-text";

export default function RoomResultsPage() {
  const router = useRouter();
  const { room, players, isLoading } = useRoomContext();
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F0FF]">
        <p className="text-loot-ink-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  // Build ranked player list from game state or room players
  const gameState = room.gameState as {
    players?: Array<{ name: string; score: number }>;
  } | null;

  const rankedPlayers: Array<{ name: string; score: number; color: string; avatar: string }> =
    gameState?.players
      ? [...gameState.players]
          .sort((a, b) => b.score - a.score)
          .map((p) => {
            const roomPlayer = players.find((rp) => rp.name === p.name);
            return {
              name: p.name,
              score: p.score,
              color: roomPlayer?.color ?? "#9B96B0",
              avatar: roomPlayer?.avatar ?? p.name.charAt(0),
            };
          })
      : [];

  const TROPHY_EMOJIS = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#0F0B1E] to-[#1A1533]">
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label={t("common.back")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">
            {room.groupName ?? "ChatLoot"}
          </h1>
          <p className="text-[11px] opacity-75">{t("game.final_scores")}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-white">
              <VerticalCutReveal containerClassName="justify-center" staggerDuration={0.06}>
                {t("game.final_scores")}
              </VerticalCutReveal>
            </h2>
          </motion.div>

          {/* Leaderboard */}
          {rankedPlayers.length > 0 ? (
            <div className="space-y-2">
              {rankedPlayers.map((player, i) => (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 rounded-xl p-4 ${
                    i === 0
                      ? "bg-[#FBBF24]/10 ring-1 ring-[#FBBF24]/30"
                      : "bg-white/5"
                  }`}
                >
                  <span className="w-8 text-center text-xl">
                    {TROPHY_EMOJIS[i] ?? `${i + 1}`}
                  </span>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.avatar}
                  </div>
                  <span className="flex-1 font-bold text-white">
                    {i === 0 ? (
                      <SparklesText text={player.name} className="!text-base !font-bold" colors={{ first: "#FBBF24", second: "#FDE68A" }} sparklesCount={6} />
                    ) : (
                      player.name
                    )}
                  </span>
                  <span className="text-lg font-black tabular-nums text-[#FBBF24]">
                    {player.score}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 p-8 text-center">
              <p className="text-sm text-[#9B96B0]">
                אין תוצאות זמינות
              </p>
            </div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3 pt-4"
          >
            <Link
              href="/room/create"
              className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] py-4 text-center text-lg font-bold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              משחק חדש
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-white/10 min-h-[44px] flex items-center justify-center text-sm font-medium text-white/70 transition-all hover:bg-white/15"
            >
              חזרה לדף הבית
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
