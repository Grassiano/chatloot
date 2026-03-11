"use client";

import { motion } from "framer-motion";

interface HostDisplayProps {
  question: string;
  options: string[];
  timeLeft: number;
  totalTime: number;
  phase: "question" | "answering" | "reveal";
  correctAnswer?: string;
  answerCounts?: Record<string, number>;
}

/** GM screen during remote mode — shows question prominently */
export function HostDisplay({
  question,
  options,
  timeLeft,
  totalTime,
  phase,
  correctAnswer,
  answerCounts,
}: HostDisplayProps) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;

  const OPTION_COLORS = ["#FBBF24", "#8B5CF6", "#FF6B6B", "#7C5CFC"];

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col bg-[#0F0B1E]">
      {/* Timer bar */}
      <div className="h-2 w-full bg-[#252040]">
        <motion.div
          className="h-full bg-[#F5C542]"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8">
        <motion.p
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-3xl font-black leading-relaxed text-white"
        >
          {question}
        </motion.p>

        {phase === "answering" && (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#F5C542]/30">
            <span className="text-4xl font-black tabular-nums text-[#F5C542]">
              {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3 p-4 pb-8">
        {options.map((option, i) => {
          const isCorrect = phase === "reveal" && option === correctAnswer;
          const count = answerCounts?.[option] ?? 0;

          return (
            <div
              key={option}
              className={`rounded-xl px-5 py-6 text-center font-bold text-white transition-all ${
                isCorrect ? "ring-4 ring-white" : ""
              }`}
              style={{
                backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length],
                opacity: phase === "reveal" && !isCorrect ? 0.4 : 1,
              }}
            >
              <p className="text-lg">{option}</p>
              {phase === "reveal" && answerCounts && (
                <p className="mt-1 text-sm opacity-80">
                  {count} {count === 1 ? "תשובה" : "תשובות"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
