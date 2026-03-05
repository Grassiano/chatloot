"use client";

import { motion } from "framer-motion";
import type { GameMode } from "@/lib/game/types";
import {
  MODE_LABELS,
  MODE_EMOJIS,
  MODE_DESCRIPTIONS,
  AVAILABLE_MODES,
} from "@/lib/game/types";

interface ModeSelectProps {
  onSelect: (mode: GameMode) => void;
}

const ALL_MODES: GameMode[] = [
  "who_said_it",
  "chat_awards",
  "time_machine",
  "caption_wars",
  "hot_seat",
];

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#1a1a2e,#0A0A0F)] px-4 py-8"
    >
      <h2 className="mb-2 text-[24px] font-bold tracking-tight text-white">בחרו מצב משחק</h2>
      <p className="mb-8 text-[14px] text-[#8B949E]">
        מה משחקים הערב?
      </p>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL_MODES.map((mode, i) => {
          const isAvailable = AVAILABLE_MODES.includes(mode);

          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => isAvailable && onSelect(mode)}
              disabled={!isAvailable}
              className={`relative rounded-2xl border p-5 text-right transition-all ${
                isAvailable
                  ? "border-white/10 bg-white/5 backdrop-blur-lg hover:border-[#F5C542]/50 hover:shadow-[0_0_30px_rgba(245,197,66,0.1)] active:scale-[0.98]"
                  : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
            >
              {!isAvailable && (
                <span className="absolute left-3 top-3 animate-pulse rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#8B949E]">
                  בקרוב
                </span>
              )}
              <span className="mb-2 block text-[28px]">
                {MODE_EMOJIS[mode]}
              </span>
              <h3 className="text-[16px] font-bold text-white">
                {MODE_LABELS[mode]}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8B949E]">
                {MODE_DESCRIPTIONS[mode]}
              </p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
