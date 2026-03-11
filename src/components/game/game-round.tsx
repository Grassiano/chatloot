"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { useGame } from "@/hooks/use-game";
import { shouldShowScores } from "@/hooks/use-game";
import type { GameQuestion } from "@/lib/game/types";
import { useTimer } from "@/hooks/use-timer";
import { Confetti } from "@/components/ui/confetti";
import { hapticTap, hapticSuccess, hapticError } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";

interface GameRoundProps {
  game: ReturnType<typeof useGame>;
  memberPhotos?: Map<string, string>;
}

export function GameRound({ game, memberPhotos }: GameRoundProps) {
  // Keep screen awake during gameplay
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    async function acquireWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock API not supported or permission denied — no-op
      }
    }
    acquireWakeLock();
    return () => {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);
  const { state } = game;
  const { phase, currentQuestion, currentRound, settings, players } = state;

  const timer = useTimer(settings.timerSeconds, () => {
    game.revealAnswer();
  });

  // Stable refs — destructured once so useEffect deps don't thrash every render
  const { showQuestion, revealAnswer, submitAnswer, showScores, nextRound } = game;
  const {
    reset: timerReset,
    start: timerStart,
    stop: timerStop,
  } = timer;

  const [answeredPlayers, setAnsweredPlayers] = useState<Set<string>>(
    new Set()
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Synchronous guard against double-tap
  const submittingRef = useRef(false);

  // Reset state on new round
  useEffect(() => {
    setAnsweredPlayers(new Set());
    setCurrentPlayerIndex(0);
    setSelectedAnswer(null);
    setShowConfetti(false);
    submittingRef.current = false;
  }, [currentRound]);

  // Trigger confetti + haptics on reveal — check all players' answers
  useEffect(() => {
    if (phase !== "reveal") return;
    const roundResult = state.roundResults.find(
      (r) => r.roundNumber === currentRound
    );
    const anyCorrect = players.some(
      (p) => roundResult?.answers.get(p.id)?.isCorrect
    );
    if (anyCorrect) {
      hapticSuccess();
      playSound("correct");
      setShowConfetti(true);
    } else {
      hapticError();
      playSound("wrong");
    }
  }, [phase, players, state.roundResults, currentRound]);

  // Auto-advance from question phase to answering after dramatic pause
  useEffect(() => {
    if (phase === "question") {
      playSound("reveal");
      const id = setTimeout(() => {
        showQuestion();
        timerReset();
        timerStart();
      }, 2000);
      return () => clearTimeout(id);
    }
  }, [phase, showQuestion, timerReset, timerStart]);

  const currentPlayer = currentQuestion ? players[currentPlayerIndex] : undefined;
  const allAnswered = answeredPlayers.size >= players.length;

  // Auto-reveal when all players have answered — with cleanup
  useEffect(() => {
    if (allAnswered && phase === "answering") {
      timerStop();
      const id = setTimeout(() => revealAnswer(), 500);
      return () => clearTimeout(id);
    }
  }, [allAnswered, phase, revealAnswer, timerStop]);

  // Auto-advance from reveal → scores (if strategic) or next question
  const [revealCountdown, setRevealCountdown] = useState(4);
  const [revealPaused, setRevealPaused] = useState(false);
  useEffect(() => {
    if (phase !== "reveal") {
      setRevealCountdown(4);
      setRevealPaused(false);
      return;
    }
    if (revealPaused) return;
    const interval = setInterval(() => {
      setRevealCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (shouldShowScores(currentRound, settings.totalRounds)) {
            showScores();
          } else {
            nextRound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentRound, settings.totalRounds, showScores, nextRound, revealPaused]);

  // Auto-advance from scores → next round (5s)
  const [scoresCountdown, setScoresCountdown] = useState(5);
  useEffect(() => {
    if (phase !== "scores") {
      setScoresCountdown(5);
      return;
    }
    const interval = setInterval(() => {
      setScoresCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          nextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, nextRound]);

  // Tap-to-pause / tap-to-continue on reveal
  const handleRevealTap = useCallback(() => {
    if (phase !== "reveal") return;
    if (revealPaused) {
      // Resume — skip directly to next
      if (shouldShowScores(currentRound, settings.totalRounds)) {
        showScores();
      } else {
        nextRound();
      }
    } else {
      setRevealPaused(true);
    }
  }, [phase, revealPaused, currentRound, settings.totalRounds, showScores, nextRound]);

  if (!currentQuestion) return null;

  function handleAnswer(answer: string) {
    if (!currentPlayer || answeredPlayers.has(currentPlayer.id)) return;
    // Synchronous double-tap guard
    if (submittingRef.current) return;
    submittingRef.current = true;

    hapticTap();
    setSelectedAnswer(answer);
    submitAnswer(currentPlayer.id, answer);

    const newAnswered = new Set(answeredPlayers);
    newAnswered.add(currentPlayer.id);
    setAnsweredPlayers(newAnswered);

    // Advance to next player (if multi-player and not all answered yet)
    if (newAnswered.size < players.length) {
      setTimeout(() => {
        setSelectedAnswer(null);
        setCurrentPlayerIndex((i) => i + 1);
        submittingRef.current = false;
      }, 600);
    } else {
      setTimeout(() => {
        setSelectedAnswer(null);
        submittingRef.current = false;
      }, 600);
    }
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
          <TimerCountdown timer={timer} />
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
                <QuestionTypeLabel question={currentQuestion} />
              </motion.p>
              <QuestionPrompt question={currentQuestion} />
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
              <QuestionPrompt question={currentQuestion} />

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
              <div className={`mt-4 grid gap-2 ${currentQuestion.type === "true_false" || currentQuestion.type === "time_guess" ? "grid-cols-1" : "grid-cols-2"}`}>
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option;
                  const showPhoto = currentQuestion.type === "who_said_it" ||
                    currentQuestion.type === "stat_trivia" ||
                    currentQuestion.type === "word_cloud" ||
                    currentQuestion.type === "ghost_detective";
                  const photoUrl = showPhoto ? memberPhotos?.get(option) : undefined;
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
                          alt={option}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      )}
                      {currentQuestion.type === "true_false" && (
                        <span className="text-[20px]">{option === "נכון" ? "✓" : "✕"}</span>
                      )}
                      <span className={currentQuestion.type === "emoji_match" && currentQuestion.targetMember ? "text-[28px]" : ""}>
                        {option}
                      </span>
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

          {/* Reveal phase — tap to pause/continue */}
          {phase === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg text-center"
              onClick={handleRevealTap}
            >
              <QuestionPrompt question={currentQuestion} />

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
                  {memberPhotos?.get(currentQuestion.correctAnswer) && (
                    <img
                      src={memberPhotos.get(currentQuestion.correctAnswer)}
                      alt={currentQuestion.correctAnswer}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <p className="text-[28px] font-black text-[#F5C542]">
                    {currentQuestion.correctAnswer}
                  </p>
                </div>
                {/* Show extra info on reveal */}
                {currentQuestion.type === "stat_trivia" && (
                  <p className="mt-1 text-[14px] text-[#8B949E]">
                    {currentQuestion.statValue}
                  </p>
                )}
                {currentQuestion.type === "word_cloud" && (
                  <p className="mt-1 text-[14px] text-[#8B949E]">
                    ״{currentQuestion.targetWord}״ — {currentQuestion.wordCount} פעמים
                  </p>
                )}
                {currentQuestion.type === "ghost_detective" && (
                  <p className="mt-1 text-[14px] text-[#8B949E]">
                    {currentQuestion.ghostDays} ימים בלי הודעה
                  </p>
                )}
                {currentQuestion.type === "time_guess" && (
                  <p className="mt-1 text-[14px] text-[#8B949E]">
                    בשעה {currentQuestion.gmNote}
                  </p>
                )}
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

              {/* Auto-advance countdown — tap to pause/continue */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex items-center justify-center gap-2 text-[13px] text-[#8B949E]"
              >
                {revealPaused ? (
                  <span>לחצו להמשיך ▶</span>
                ) : (
                  <span>ממשיכים בעוד {revealCountdown}... (לחצו לעצור)</span>
                )}
              </motion.div>
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

              {/* Auto-advance countdown bar — driven by state for sync */}
              <div className="mt-8">
                <div className="mb-2 text-center text-[13px] text-[#8B949E]">
                  ממשיכים בעוד {scoresCountdown}...
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#21262D]">
                  <div
                    className="h-full rounded-full bg-[#F5C542] transition-all duration-1000 ease-linear"
                    style={{ width: `${(scoresCountdown / 5) * 100}%` }}
                  />
                </div>
              </div>
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
  const lastTickRef = useRef(-1);

  useEffect(() => {
    const rounded = Math.ceil(timeLeft);
    if (rounded <= 5 && rounded > 0 && rounded !== lastTickRef.current) {
      lastTickRef.current = rounded;
      playSound("tick");
    }
  }, [timeLeft]);

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

/** Isolated countdown text — absorbs 100ms timer re-renders */
function TimerCountdown({ timer }: { timer: ReturnType<typeof useTimer> }) {
  return (
    <span className="text-[13px] tabular-nums text-[#8B949E]">
      {Math.ceil(timer.timeLeft)} שניות
    </span>
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

/** Label shown above the question content */
function QuestionTypeLabel({ question }: { question: GameQuestion }) {
  switch (question.type) {
    case "who_said_it":
      return <>מי אמר את זה?</>;
    case "stat_trivia":
      return <>📊 טריוויה</>;
    case "emoji_match":
      return <>😎 אימוג׳ים</>;
    case "true_false":
      return <>נכון או לא?</>;
    case "word_cloud":
      return <>🔤 של מי המילה?</>;
    case "time_guess":
      return <>⏰ מתי נשלח?</>;
    case "ghost_detective":
      return <>🕵️ מי נעלם?</>;
  }
}

/** Renders the main question content (bubble, prompt, statement, etc.) */
function QuestionPrompt({ question }: { question: GameQuestion }) {
  switch (question.type) {
    case "who_said_it":
      return <MessageBubble text={question.messageText} />;
    case "stat_trivia":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm text-center"
        >
          <p className="text-[13px] font-medium text-[#8B949E]">📊 טריוויה</p>
          <p className="mt-2 text-[22px] font-bold leading-snug text-[#F0F6FC]">
            {question.prompt}
          </p>
        </motion.div>
      );
    case "emoji_match":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm text-center"
        >
          {question.targetEmoji && (
            <p className="mb-2 text-[48px]">{question.targetEmoji}</p>
          )}
          <p className="text-[20px] font-bold leading-snug text-[#F0F6FC]">
            {question.prompt}
          </p>
        </motion.div>
      );
    case "true_false":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg backdrop-blur-lg text-center"
        >
          <p className="text-[19px] font-bold leading-relaxed text-[#F0F6FC]">
            {question.statement}
          </p>
        </motion.div>
      );
    case "word_cloud":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm text-center"
        >
          <p className="mb-3 text-[40px] font-black text-[#F5C542]">
            ״{question.targetWord}״
          </p>
          <p className="text-[14px] text-[#8B949E]">
            {question.wordCount} פעמים
          </p>
          <p className="mt-2 text-[20px] font-bold leading-snug text-[#F0F6FC]">
            {question.prompt}
          </p>
        </motion.div>
      );
    case "time_guess":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm text-center"
        >
          <MessageBubble text={question.messageText} />
          <p className="mt-3 text-[14px] text-[#8B949E]">
            נשלח על ידי {question.messageAuthor}
          </p>
          <p className="mt-2 text-[18px] font-bold leading-snug text-[#F0F6FC]">
            {question.prompt}
          </p>
        </motion.div>
      );
    case "ghost_detective":
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-sm text-center"
        >
          <p className="mb-2 text-[48px]">🕵️</p>
          <p className="text-[36px] font-black tabular-nums text-[#F5C542]">
            {question.ghostDays} ימים
          </p>
          <p className="mt-2 text-[20px] font-bold leading-snug text-[#F0F6FC]">
            {question.prompt}
          </p>
        </motion.div>
      );
  }
}
