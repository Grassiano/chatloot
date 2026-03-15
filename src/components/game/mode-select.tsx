"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [selected, setSelected] = useState<GameMode | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#1a1a2e,#0F0B1E)] px-4 py-8"
    >
      <h2 className="mb-2 text-[24px] font-bold tracking-tight text-white">בחרו מצב משחק</h2>
      <p className="mb-8 text-[14px] text-[#9B96B0]">
        מה משחקים הערב?
      </p>

      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL_MODES.map((mode, i) => {
          const isAvailable = AVAILABLE_MODES.includes(mode);
          const isSelected = selected === mode;

          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => isAvailable && setSelected(mode)}
              disabled={!isAvailable}
              className={`relative rounded-2xl border p-5 text-right transition-all ${
                isSelected
                  ? "border-[#FBBF24] bg-[#FBBF24]/10 shadow-[0_0_30px_rgba(245,197,66,0.2)] ring-2 ring-[#FBBF24]/50"
                  : isAvailable
                    ? "border-white/10 bg-white/5 backdrop-blur-lg hover:border-[#FBBF24]/50 hover:shadow-[0_0_30px_rgba(245,197,66,0.1)] active:scale-[0.98]"
                    : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
            >
              {!isAvailable && (
                <span className="absolute right-3 top-3 animate-pulse rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#9B96B0]">
                  בקרוב
                </span>
              )}
              {isSelected && (
                <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FBBF24] text-[12px] font-bold text-[#0F0B1E]">
                  ✓
                </span>
              )}
              <span className="mb-2 block text-[28px]">
                {MODE_EMOJIS[mode]}
              </span>
              <h3 className={`text-[16px] font-bold ${isSelected ? "text-[#FBBF24]" : "text-white"}`}>
                {MODE_LABELS[mode]}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#9B96B0]">
                {MODE_DESCRIPTIONS[mode]}
              </p>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={() => onSelect(selected)}
            className="mt-8 min-h-[52px] w-full max-w-lg rounded-2xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] px-8 text-[17px] font-bold text-[#0F0B1E] shadow-[0_4px_20px_rgba(245,197,66,0.3)] transition-transform active:scale-[0.97]"
          >
            יאללה, מתחילים! 🎮
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
