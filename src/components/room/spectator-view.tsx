"use client";

import { motion } from "framer-motion";
import { PlayerList } from "./player-list";
import type { RoomPlayer } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";

interface SpectatorViewProps {
  players: RoomPlayer[];
  sessionId: string;
}

/** What players see on their phone during party mode (game runs on GM screen) */
export function SpectatorView({ players, sessionId }: SpectatorViewProps) {
  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#F8F7FF] to-[#FAFAFE] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 rounded-2xl border border-white/30 bg-white/80 p-8 text-center shadow-md backdrop-blur-md"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-5xl"
        >
          📺
        </motion.div>
        <h2 className="text-xl font-bold text-loot-ink">
          {t("spectator.title")}
        </h2>
        <p className="text-sm text-loot-ink-secondary">
          {t("spectator.subtitle")}
        </p>
      </motion.div>

      <div className="w-full max-w-sm">
        <PlayerList players={players} sessionId={sessionId} />
      </div>
    </div>
  );
}
