"use client";

import { motion } from "framer-motion";
import type { GameModeType } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";

interface ModePickerProps {
  selected: GameModeType | null;
  onSelect: (mode: GameModeType) => void;
}

const MODES: { key: GameModeType; emoji: string; titleKey: "lobby.mode.party" | "lobby.mode.remote"; descKey: "lobby.mode.party.desc" | "lobby.mode.remote.desc" }[] = [
  {
    key: "party",
    emoji: "📺",
    titleKey: "lobby.mode.party",
    descKey: "lobby.mode.party.desc",
  },
  {
    key: "remote",
    emoji: "📱",
    titleKey: "lobby.mode.remote",
    descKey: "lobby.mode.remote.desc",
  },
];

export function ModePicker({ selected, onSelect }: ModePickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-center text-sm font-bold text-loot-ink">
        {t("lobby.mode.title")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((mode) => {
          const isSelected = selected === mode.key;
          return (
            <motion.button
              key={mode.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(mode.key)}
              className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                isSelected
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-md"
                  : "border-white/30 bg-white/80 hover:border-[#8B5CF6]/30"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="mode-check"
                  className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6] text-white"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </motion.div>
              )}
              <div className="text-3xl">{mode.emoji}</div>
              <p className="mt-2 text-sm font-bold text-loot-ink">
                {t(mode.titleKey)}
              </p>
              <p className="mt-1 text-xs text-loot-ink-secondary">
                {t(mode.descKey)}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
