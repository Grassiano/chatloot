"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { roomApi } from "@/lib/room/api";
import { PlayerAnswer } from "@/components/room/player-answer";
import type { Room, RoomPlayer } from "@/lib/room/types";
import type { BroadcastGameState } from "@/lib/game/broadcast";
import { t } from "@/lib/i18n/he";

interface PlayerGameViewProps {
  room: Room;
  players: RoomPlayer[];
  sessionId: string;
  hideQuestion: boolean;
}

/** What players see during the game on their phone (both party and remote modes) */
export function PlayerGameView({
  room,
  players,
  sessionId,
  hideQuestion,
}: PlayerGameViewProps) {
  const gameState = room.gameState as BroadcastGameState | null;
  const currentPlayer = players.find((p) => p.sessionId === sessionId);
  const [answered, setAnswered] = useState(false);
  const [myResult, setMyResult] = useState<{
    isCorrect: boolean;
    scoreAwarded: number;
  } | null>(null);
  const lastRoundRef = useRef(0);

  // Reset answer state on new round
  useEffect(() => {
    if (!gameState) return;
    if (gameState.currentRound !== lastRoundRef.current) {
      lastRoundRef.current = gameState.currentRound;
      setAnswered(false);
      setMyResult(null);
    }
  }, [gameState?.currentRound, gameState]);

  // Derive time left from roundStartedAt
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (
      !gameState ||
      gameState.phase !== "answering" ||
      !gameState.roundStartedAt
    ) {
      return;
    }

    function tick() {
      const elapsed = (Date.now() - gameState!.roundStartedAt!) / 1000;
      const remaining = Math.max(
        0,
        Math.ceil(gameState!.timerSeconds - elapsed)
      );
      setTimeLeft(remaining);
    }

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [gameState?.phase, gameState?.roundStartedAt, gameState?.timerSeconds, gameState]);

  // Extract my result from broadcast on reveal
  useEffect(() => {
    if (!gameState || gameState.phase !== "reveal" || !currentPlayer) return;
    const result = gameState.playerResults?.[currentPlayer.id];
    if (result) setMyResult(result);
  }, [gameState?.phase, gameState?.playerResults, currentPlayer]);

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentPlayer || !gameState || answered) return;
      setAnswered(true);

      const answerTime = gameState.roundStartedAt
        ? Date.now() - gameState.roundStartedAt
        : 0;

      try {
        await roomApi.submitAnswer(
          room.code,
          currentPlayer.id,
          gameState.currentRound,
          answer,
          answerTime
        );
      } catch {
        // Answer submission failed — player stays locked
      }
    },
    [currentPlayer, gameState, answered, room.code]
  );

  if (!gameState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-4 text-5xl"
        >
          ⏳
        </motion.div>
        <p className="text-lg font-bold text-white">{t("common.loading")}</p>
      </div>
    );
  }

  const { phase, question } = gameState;

  // Waiting for question
  if (phase === "waiting" || phase === "question") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="mb-4 text-5xl"
        >
          🎯
        </motion.div>
        <p className="text-lg font-bold text-white">
          {phase === "question" ? `סיבוב ${gameState.currentRound}` : t("player.waiting")}
        </p>
        <p className="mt-2 text-sm text-[#9B96B0]">
          {gameState.currentRound > 0
            ? `${gameState.currentRound} / ${gameState.totalRounds}`
            : "ממתינים שהמנחה יתחיל..."}
        </p>
      </div>
    );
  }

  // Answering phase
  if (phase === "answering" && question) {
    if (answered) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mb-4 text-5xl"
          >
            🔒
          </motion.div>
          <p className="text-lg font-bold text-white">נעול!</p>
          <p className="mt-2 text-sm text-[#9B96B0]">ממתין לחשיפה...</p>

          {/* Show who else answered */}
          <div className="mt-6 flex gap-1.5">
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className="h-3 w-3 rounded-full transition-colors"
                style={{
                  backgroundColor: gameState.answeredPlayerIds.includes(p.id)
                    ? p.color
                    : "#352F55",
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // Build question text from broadcast question
    const questionText = getQuestionText(question);

    return (
      <PlayerAnswer
        question={questionText}
        options={question.options}
        timeLeft={timeLeft}
        totalTime={gameState.timerSeconds}
        onAnswer={handleAnswer}
        hideQuestion={hideQuestion}
      />
    );
  }

  // Reveal phase
  if (phase === "reveal") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-sm text-[#9B96B0]">התשובה היא...</p>
          <p className="text-3xl font-black text-[#FBBF24]">
            {gameState.correctAnswer}
          </p>

          {myResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`mt-4 rounded-xl px-6 py-3 text-center ${
                myResult.isCorrect
                  ? "bg-[#00D68F]/20"
                  : "bg-[#FF4757]/10"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  myResult.isCorrect ? "text-[#00D68F]" : "text-[#FF4757]"
                }`}
              >
                {myResult.isCorrect
                  ? `+${myResult.scoreAwarded}`
                  : "✕"}
              </p>
              <p className="mt-1 text-sm text-[#9B96B0]">
                {myResult.isCorrect ? "נכון!" : "לא נכון"}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Scores phase
  if (phase === "scores") {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    return (
      <div className="flex min-h-screen flex-col bg-[#0F0B1E] px-4 py-8">
        <p className="mb-6 text-center text-lg font-bold text-[#FBBF24]">
          טבלת ניקוד
        </p>
        <div className="mx-auto w-full max-w-sm space-y-2">
          {sorted.map((player, rank) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rank * 0.1 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                player.id === currentPlayer?.id
                  ? "border-[#FBBF24]/40 bg-[#FBBF24]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="w-6 text-center text-base font-black text-[#9B96B0]">
                {rank === 0 ? "👑" : rank + 1}
              </span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: player.color }}
              >
                {player.avatar}
              </div>
              <span className="flex-1 text-sm font-medium text-white">
                {player.name}
              </span>
              <span className="text-base font-bold tabular-nums text-[#FBBF24]">
                {player.score}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Final phase
  if (phase === "final") {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <span className="text-6xl">🏆</span>
          <p className="text-2xl font-black text-[#FBBF24]">
            {winner?.name}
          </p>
          <p className="text-sm text-[#9B96B0]">
            {winner?.score} נקודות
          </p>
        </motion.div>

        <div className="mt-8 w-full max-w-sm space-y-2">
          {sorted.map((player, rank) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                player.id === currentPlayer?.id
                  ? "border-[#FBBF24]/40 bg-[#FBBF24]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="w-6 text-center text-base font-black text-[#9B96B0]">
                {rank === 0 ? "👑" : rank + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-white">
                {player.name}
              </span>
              <span className="text-base font-bold tabular-nums text-[#FBBF24]">
                {player.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0B1E]">
      <p className="text-[#9B96B0]">{t("common.loading")}</p>
    </div>
  );
}

/** Extract displayable question text from broadcast question */
function getQuestionText(
  q: NonNullable<BroadcastGameState["question"]>
): string {
  if (q.messageText) return q.messageText;
  if (q.statement) return q.statement;
  return q.prompt;
}
