"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PlayerAnswerProps {
  question: string;
  options: string[];
  timeLeft: number;
  totalTime: number;
  onAnswer: (answer: string) => void;
}

/** What players see on their phone during remote mode — answer buttons */
export function PlayerAnswer({
  question,
  options,
  timeLeft,
  totalTime,
  onAnswer,
}: PlayerAnswerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;

  function handleSelect(option: string) {
    if (selected) return;
    setSelected(option);
    onAnswer(option);
  }

  const OPTION_COLORS = ["#FBBF24", "#8B5CF6", "#FF6B6B", "#7C5CFC"];

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col bg-[#0F0B1E]">
      {/* Timer bar */}
      <div className="h-1 w-full bg-[#252040]">
        <motion.div
          className="h-full bg-[#F5C542]"
          initial={{ width: "100%" }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
        <p className="text-center text-lg font-bold text-white">{question}</p>

        {/* Timer number */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#F5C542]/30">
          <span className="text-xl font-black tabular-nums text-[#F5C542]">
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-2 p-3 pb-6">
        <AnimatePresence>
          {options.map((option, i) => {
            const isSelected = selected === option;
            const isDisabled = selected !== null && !isSelected;
            return (
              <motion.button
                key={option}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(option)}
                disabled={selected !== null}
                className={`rounded-xl px-4 py-5 text-sm font-bold text-white transition-all ${
                  isSelected
                    ? "scale-[1.03] ring-2 ring-white"
                    : isDisabled
                      ? "opacity-30"
                      : "active:scale-[0.97]"
                }`}
                style={{
                  backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length],
                }}
              >
                {option}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Locked in state */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-6 text-center text-sm font-medium text-[#9B96B0]"
        >
          נעול! ממתין לחשיפה...
        </motion.div>
      )}
    </div>
  );
}
