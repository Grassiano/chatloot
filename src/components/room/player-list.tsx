"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { RoomPlayer } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";

interface PlayerListProps {
  players: RoomPlayer[];
  sessionId?: string;
}

export function PlayerList({ players, sessionId }: PlayerListProps) {
  const nonGmPlayers = players.filter((p) => !p.isGm);

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 shadow-md backdrop-blur-md">
      <div className="border-b border-loot-ink/5 px-4 py-3">
        <h3 className="text-sm font-bold text-loot-ink">
          {t("lobby.players")} ({nonGmPlayers.length})
        </h3>
      </div>

      {nonGmPlayers.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-loot-ink-secondary">
          ממתין לשחקנים...
        </div>
      ) : (
        <div className="divide-y divide-loot-ink/5">
          <AnimatePresence>
            {nonGmPlayers.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: player.color }}
                >
                  {player.avatar}
                </div>
                <span className="flex-1 text-sm font-medium text-loot-ink">
                  {player.name}
                </span>
                {player.sessionId === sessionId && (
                  <span className="rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-[11px] font-bold text-[#8B5CF6]">
                    אתם
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
