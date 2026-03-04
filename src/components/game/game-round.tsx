"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { useGame } from "@/hooks/use-game";
import { useTimer } from "@/hooks/use-timer";

interface GameRoundProps {
  game: ReturnType<typeof useGame>;
}

export function GameRound({ game }: GameRoundProps) {
  const { state } = game;
  const { phase, currentQuestion, currentRound, settings, players } = state;

  const timer = useTimer(settings.timerSeconds, () => {
    // Time's up — reveal answer
    game.revealAnswer();
  });

  // Track which players have answered this round
  const [answeredPlayers, setAnsweredPlayers] = useState<Set<string>>(
    new Set()
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  // Reset state on new round
  useEffect(() => {
    setAnsweredPlayers(new Set());
    setSelectedAnswer(null);
    setCurrentPlayerIdx(0);
  }, [currentRound]);

  // Auto-advance from question to answering after dramatic pause
  useEffect(() => {
    if (phase === "question") {
      const timeout = setTimeout(() => {
        game.showQuestion();
        timer.reset();
        timer.start();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [phase, game, timer]);

  const currentPlayer = currentQuestion ? players[currentPlayerIdx] : undefined;
  const allAnswered = answeredPlayers.size >= players.length;

  // Auto-reveal when all players answered
  useEffect(() => {
    if (allAnswered && phase === "answering") {
      timer.stop();
      setTimeout(() => game.revealAnswer(), 500);
    }
  }, [allAnswered, phase, game, timer]);

  if (!currentQuestion) return null;

  function handleAnswer(answer: string) {
    if (!currentPlayer || answeredPlayers.has(currentPlayer.id)) return;

    setSelectedAnswer(answer);
    game.submitAnswer(currentPlayer.id, answer);

    const newAnswered = new Set(answeredPlayers);
    newAnswered.add(currentPlayer.id);
    setAnsweredPlayers(newAnswered);

    // Move to next player after brief delay
    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentPlayerIdx < players.length - 1) {
        setCurrentPlayerIdx((prev) => prev + 1);
      }
    }, 600);
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col bg-[#0D1117] text-white">
      {/* Timer bar */}
      {(phase === "answering" || phase === "question") && (
        <div className="h-1.5 w-full bg-[#21262D]">
          <motion.div
            className="h-full origin-right"
            style={{
              backgroundColor:
                timer.progress > 0.5
                  ? "#00A884"
                  : timer.progress > 0.2
                    ? "#E2A829"
                    : "#FF6B6B",
            }}
            animate={{ scaleX: timer.progress }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Round counter */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-medium text-[#8B949E]">
          סיבוב {currentRound} / {settings.totalRounds}
        </span>
        {phase === "answering" && (
          <span className="text-[13px] tabular-nums text-[#8B949E]">
            {Math.ceil(timer.timeLeft)} שניות
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
        <AnimatePresence mode="wait">
          {/* Question phase — dramatic reveal */}
          {phase === "question" && (
            <motion.div
              key="question-reveal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg text-center"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7, 1] }}
                transition={{ duration: 1 }}
                className="mb-6 text-[15px] font-medium text-[#E2A829]"
              >
                מי אמר את זה?
              </motion.p>
              <MessageBubble text={currentQuestion.messageText} />
            </motion.div>
          )}

          {/* Answering phase — show options */}
          {phase === "answering" && (
            <motion.div
              key="answering"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg"
            >
              {/* The message */}
              <MessageBubble text={currentQuestion.messageText} />

              {/* Current player indicator */}
              {currentPlayer && !allAnswered && (
                <motion.div
                  key={currentPlayer.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <span className="text-[13px] text-[#8B949E]">תור של </span>
                  <span
                    className="text-[14px] font-bold"
                    style={{ color: currentPlayer.color }}
                  >
                    {currentPlayer.name}
                  </span>
                </motion.div>
              )}

              {/* Answer options */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option;
                  return (
                    <motion.button
                      key={option}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(option)}
                      disabled={
                        !currentPlayer ||
                        answeredPlayers.has(currentPlayer.id) ||
                        allAnswered
                      }
                      className={`rounded-xl px-4 py-4 text-[15px] font-medium transition-all ${
                        isSelected
                          ? "bg-[#E2A829] text-[#0D1117]"
                          : "bg-[#161B22] text-white hover:bg-[#21262D]"
                      } disabled:opacity-40`}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* Answered indicator */}
              {players.length > 1 && (
                <div className="mt-4 flex justify-center gap-1.5">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        answeredPlayers.has(p.id)
                          ? "bg-[#00A884]"
                          : "bg-[#30363D]"
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Reveal phase */}
          {phase === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg text-center"
            >
              <MessageBubble text={currentQuestion.messageText} />

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.3,
                }}
                className="mt-6"
              >
                <p className="mb-2 text-[14px] text-[#8B949E]">
                  התשובה היא...
                </p>
                <p className="text-[28px] font-black text-[#E2A829]">
                  {currentQuestion.correctAuthor}
                </p>
              </motion.div>

              {/* Per-player results */}
              <div className="mt-6 space-y-2">
                {players.map((player) => {
                  const result = state.roundResults
                    .find((r) => r.roundNumber === currentRound)
                    ?.answers.get(player.id);
                  const isCorrect = result?.isCorrect ?? false;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className={`flex items-center justify-between rounded-lg px-4 py-2 ${
                        isCorrect ? "bg-[#00A884]/20" : "bg-[#FF6B6B]/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: player.color }}
                        >
                          {player.name}
                        </span>
                        <span className="text-[12px] text-[#8B949E]">
                          {result?.answer ?? "לא ענה"}
                        </span>
                      </div>
                      <span
                        className={`text-[14px] font-bold ${
                          isCorrect ? "text-[#00A884]" : "text-[#FF6B6B]"
                        }`}
                      >
                        {isCorrect ? `+${result?.scoreAwarded}` : "✕"}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={game.showScores}
                className="mt-6 rounded-xl bg-[#E2A829] px-6 py-3 text-[15px] font-bold text-[#0D1117] transition-transform hover:scale-105 active:scale-95"
              >
                טבלת ניקוד
              </motion.button>
            </motion.div>
          )}

          {/* Scores phase */}
          {phase === "scores" && (
            <motion.div
              key="scores"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg"
            >
              <p className="mb-6 text-center text-[18px] font-bold text-[#E2A829]">
                טבלת ניקוד
              </p>

              <div className="space-y-2">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, rank) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: rank * 0.1 }}
                      className="flex items-center gap-3 rounded-xl bg-[#161B22] px-4 py-3"
                    >
                      <span className="w-6 text-center text-[16px] font-black text-[#8B949E]">
                        {rank === 0 ? "👑" : rank + 1}
                      </span>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.avatar}
                      </div>
                      <span className="flex-1 text-[15px] font-medium">
                        {player.name}
                      </span>
                      <span className="text-[16px] font-bold tabular-nums text-[#E2A829]">
                        {player.score}
                      </span>
                    </motion.div>
                  ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={game.nextRound}
                className="mt-8 w-full rounded-xl bg-[#E2A829] py-4 text-[16px] font-bold text-[#0D1117] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {currentRound < settings.totalRounds
                  ? "סיבוב הבא →"
                  : "תוצאות סופיות"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MessageBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-sm rounded-2xl bg-[#161B22] px-5 py-4 shadow-lg"
    >
      <p className="text-[17px] leading-relaxed text-[#F0F6FC]">{text}</p>
    </motion.div>
  );
}
