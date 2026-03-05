"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { useGame } from "@/hooks/use-game";
import { useTimer } from "@/hooks/use-timer";
import { Confetti } from "@/components/ui/confetti";
import { hapticTap, hapticSuccess, hapticError } from "@/lib/haptics";

interface GameRoundProps {
  game: ReturnType<typeof useGame>;
  memberPhotos?: Map<string, string>;
}

export function GameRound({ game, memberPhotos }: GameRoundProps) {
  const { state } = game;
  const { phase, currentQuestion, currentRound, settings, players } = state;

  const timer = useTimer(settings.timerSeconds, () => {
    game.revealAnswer();
  });

  // Stable refs — destructured once so useEffect deps don't thrash every render
  const { showQuestion, revealAnswer, submitAnswer, showScores, nextRound } =
    game;
  const {
    reset: timerReset,
    start: timerStart,
    stop: timerStop,
  } = timer;

  const [answeredPlayers, setAnsweredPlayers] = useState<Set<string>>(
    new Set()
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset state on new round
  useEffect(() => {
    setAnsweredPlayers(new Set());
    setSelectedAnswer(null);
    setShowConfetti(false);
  }, [currentRound]);

  // Trigger confetti + haptics on reveal when player got it right
  useEffect(() => {
    if (phase !== "reveal") return;
    const currentPlayer = players[0];
    if (!currentPlayer) return;
    const result = state.roundResults
      .find((r) => r.roundNumber === currentRound)
      ?.answers.get(currentPlayer.id);
    if (result?.isCorrect) {
      hapticSuccess();
      setShowConfetti(true);
    } else {
      hapticError();
    }
  }, [phase, players, state.roundResults, currentRound]);

  // Auto-advance from question phase to answering after dramatic pause
  useEffect(() => {
    if (phase === "question") {
      const id = setTimeout(() => {
        showQuestion();
        timerReset();
        timerStart();
      }, 2000);
      return () => clearTimeout(id);
    }
  }, [phase, showQuestion, timerReset, timerStart]);

  const currentPlayer = currentQuestion ? players[0] : undefined;
  const allAnswered = answeredPlayers.size >= players.length;

  // Auto-reveal when all players have answered — with cleanup
  useEffect(() => {
    if (allAnswered && phase === "answering") {
      timerStop();
      const id = setTimeout(() => revealAnswer(), 500);
      return () => clearTimeout(id);
    }
  }, [allAnswered, phase, revealAnswer, timerStop]);

  if (!currentQuestion) return null;

  function handleAnswer(answer: string) {
    if (!currentPlayer || answeredPlayers.has(currentPlayer.id)) return;

    hapticTap();
    setSelectedAnswer(answer);
    submitAnswer(currentPlayer.id, answer);

    const newAnswered = new Set(answeredPlayers);
    newAnswered.add(currentPlayer.id);
    setAnsweredPlayers(newAnswered);

    setTimeout(() => {
      setSelectedAnswer(null);
    }, 600);
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col bg-[radial-gradient(circle_at_center,#141420,#0A0A0F)] text-white">
      <Confetti active={showConfetti} count={50} duration={2500} />

      {/* Timer bar — isolated sub-component, re-renders independently */}
      {(phase === "answering" || phase === "question") && (
        <TimerBar timer={timer} />
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
                className="mb-6 text-[15px] font-medium text-[#F5C542]"
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
              <MessageBubble text={currentQuestion.messageText} />

              {/* Current player indicator (multi-player only) */}
              {players.length > 1 && currentPlayer && !allAnswered && (
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
                  const photoUrl = memberPhotos?.get(option);
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
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-[15px] font-medium transition-all ${
                        isSelected
                          ? "border-[#F5C542] bg-[#F5C542] text-[#0A0A0F] ring-2 ring-[#F5C542] shadow-[0_0_16px_rgba(245,197,66,0.2)]"
                          : "border-white/10 bg-white/5 text-white backdrop-blur-md hover:border-white/20 hover:bg-white/10"
                      } disabled:opacity-40`}
                    >
                      {photoUrl && (
                        <img
                          src={photoUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      )}
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* Per-player answered dots — colored when answered */}
              {players.length > 1 && (
                <div className="mt-4 flex justify-center gap-1.5">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="h-2 w-2 rounded-full transition-colors"
                      style={{
                        backgroundColor: answeredPlayers.has(p.id)
                          ? p.color
                          : "#30363D",
                      }}
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
                <div className="flex items-center justify-center gap-3">
                  {memberPhotos?.get(currentQuestion.correctAuthor) && (
                    <img
                      src={memberPhotos.get(currentQuestion.correctAuthor)}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <p className="text-[28px] font-black text-[#F5C542]">
                    {currentQuestion.correctAuthor}
                  </p>
                </div>
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
                        isCorrect ? "bg-[#00D68F]/20" : "bg-[#FF4757]/10"
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
                          isCorrect ? "text-[#00D68F]" : "text-[#FF4757]"
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
                onClick={showScores}
                className="mt-6 rounded-xl bg-[#F5C542] px-6 py-3 text-[15px] font-bold text-[#0D1117] transition-transform hover:scale-105 active:scale-95"
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
              <p className="mb-6 text-center text-[18px] font-bold text-[#F5C542]">
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
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md"
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
                      <span className="text-[16px] font-bold tabular-nums text-[#F5C542]">
                        {player.score}
                      </span>
                    </motion.div>
                  ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={nextRound}
                className="mt-8 w-full rounded-xl bg-[#F5C542] py-4 text-[16px] font-bold text-[#0A0A0F] shadow-[0_4px_20px_rgba(245,197,66,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
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

// Isolated timer sub-component — re-renders at 100ms intervals without
// pulling the entire GameRound tree along for the ride.
function TimerBar({ timer }: { timer: ReturnType<typeof useTimer> }) {
  const { progress, timeLeft } = timer;

  const color =
    progress > 0.5 ? "#00A884" : progress > 0.2 ? "#E2A829" : "#FF6B6B";

  return (
    <div className="h-1.5 w-full bg-[#21262D]">
      <div
        className="h-full origin-left"
        style={{
          width: `${progress * 100}%`,
          backgroundColor: color,
          transition: "width 0.1s linear, background-color 0.3s ease",
        }}
      />
    </div>
  );
}

function MessageBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg backdrop-blur-lg"
    >
      <p className="text-[17px] leading-relaxed text-[#F0F6FC]">{text}</p>
    </motion.div>
  );
}
