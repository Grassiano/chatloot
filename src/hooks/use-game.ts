"use client";

import { useState, useCallback, useRef } from "react";
import type { ParsedChat } from "@/lib/parser/types";
import type {
  GameState,
  GameSettings,
  Player,
  PlayerAnswer,
  WhoSaidItQuestion,
  RoundResult,
} from "@/lib/game/types";
import { DEFAULT_SETTINGS, PLAYER_COLORS } from "@/lib/game/types";
import { generateWhoSaidItQuestions } from "@/lib/game/modes/who-said-it";
import { calculateScore } from "@/lib/game/scoring";

interface UseGameReturn {
  state: GameState;
  /** Initialize the game with parsed chat data. Optionally pass AI-generated questions. */
  initGame: (chat: ParsedChat, settings?: Partial<GameSettings>, aiQuestions?: WhoSaidItQuestion[]) => void;
  /** Add a player to the game */
  addPlayer: (name: string) => Player;
  /** Remove a player */
  removePlayer: (playerId: string) => void;
  /** Start the game (move from lobby to first question) */
  startGame: () => void;
  /** Show the current question (move to answering phase) */
  showQuestion: () => void;
  /** Submit a player's answer */
  submitAnswer: (playerId: string, answer: string) => PlayerAnswer;
  /** Reveal the correct answer */
  revealAnswer: () => void;
  /** Show the scoreboard between rounds */
  showScores: () => void;
  /** Advance to next round or finish game */
  nextRound: () => void;
  /** Restart with the same chat data — re-generates questions, resets scores, goes to lobby */
  restartGame: () => void;
  /** Reset everything back to upload/setup phase */
  reset: () => void;
}

const INITIAL_STATE: GameState = {
  settings: DEFAULT_SETTINGS,
  phase: "setup",
  players: [],
  currentRound: 0,
  currentQuestion: null,
  roundResults: [],
  roundStartTime: null,
};

export function useGame(): UseGameReturn {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const questionsRef = useRef<WhoSaidItQuestion[]>([]);
  const roundStartRef = useRef<number>(0);
  const playerCountRef = useRef<number>(0);
  const chatRef = useRef<ParsedChat | null>(null);

  const initGame = useCallback(
    (chat: ParsedChat, settings?: Partial<GameSettings>, aiQuestions?: WhoSaidItQuestion[]) => {
      const merged = { ...DEFAULT_SETTINGS, ...settings };

      // Store chat so restartGame can re-use it
      chatRef.current = chat;

      // Use AI questions if provided, otherwise fall back to random
      const questions =
        aiQuestions && aiQuestions.length > 0
          ? aiQuestions
          : generateWhoSaidItQuestions(chat, merged.totalRounds);
      questionsRef.current = questions;

      // Adjust total rounds to available questions
      merged.totalRounds = Math.min(merged.totalRounds, questions.length);

      // Reset synchronous player count so colors start fresh
      playerCountRef.current = 0;

      setState({
        ...INITIAL_STATE,
        settings: merged,
        phase: "lobby",
      });
    },
    []
  );

  const addPlayer = useCallback((name: string): Player => {
    // Resolve color synchronously before setState so the returned player is correct
    const color = PLAYER_COLORS[playerCountRef.current % PLAYER_COLORS.length];
    playerCountRef.current += 1;

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      avatar: name.charAt(0),
      color,
      score: 0,
      streak: 0,
    };

    setState((prev) => ({
      ...prev,
      players: [...prev.players, player],
    }));

    return player;
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setState((prev) => {
      const remaining = prev.players.filter((p) => p.id !== playerId);
      // Recalculate ref so the next addPlayer picks the right color slot
      playerCountRef.current = remaining.length;
      return { ...prev, players: remaining };
    });
  }, []);

  const startGame = useCallback(() => {
    const firstQuestion = questionsRef.current[0];
    if (!firstQuestion) return;

    setState((prev) => ({
      ...prev,
      phase: "question",
      currentRound: 1,
      currentQuestion: firstQuestion,
    }));
  }, []);

  const showQuestion = useCallback(() => {
    roundStartRef.current = Date.now();
    setState((prev) => ({
      ...prev,
      phase: "answering",
      roundStartTime: Date.now(),
    }));
  }, []);

  const submitAnswer = useCallback(
    (playerId: string, answer: string): PlayerAnswer => {
      const timeMs = Date.now() - roundStartRef.current;

      let playerAnswer: PlayerAnswer = {
        playerId,
        answer,
        isCorrect: false,
        timeMs,
        scoreAwarded: 0,
      };

      setState((prev) => {
        const question = prev.currentQuestion;
        if (!question) return prev;

        const isCorrect = answer === question.correctAuthor;
        const player = prev.players.find((p) => p.id === playerId);
        if (!player) return prev;

        const newStreak = isCorrect ? player.streak + 1 : 0;
        const scoreAwarded = isCorrect
          ? calculateScore(timeMs, prev.settings.timerSeconds, newStreak)
          : 0;

        playerAnswer = {
          playerId,
          answer,
          isCorrect,
          timeMs,
          scoreAwarded,
        };

        // Update player score and streak
        const updatedPlayers = prev.players.map((p) =>
          p.id === playerId
            ? { ...p, score: p.score + scoreAwarded, streak: newStreak }
            : p
        );

        // Add to current round results
        const currentResult: RoundResult = prev.roundResults.find(
          (r) => r.roundNumber === prev.currentRound
        ) ?? {
          roundNumber: prev.currentRound,
          question,
          answers: new Map(),
        };

        currentResult.answers.set(playerId, playerAnswer);

        const updatedResults = prev.roundResults.filter(
          (r) => r.roundNumber !== prev.currentRound
        );
        updatedResults.push(currentResult);

        return {
          ...prev,
          players: updatedPlayers,
          roundResults: updatedResults,
        };
      });

      return playerAnswer;
    },
    []
  );

  const revealAnswer = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "reveal" }));
  }, []);

  const showScores = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "scores" }));
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      const nextRoundNum = prev.currentRound + 1;

      // Game over?
      if (nextRoundNum > prev.settings.totalRounds) {
        return { ...prev, phase: "final" };
      }

      const nextQuestion = questionsRef.current[nextRoundNum - 1];
      if (!nextQuestion) {
        return { ...prev, phase: "final" };
      }

      return {
        ...prev,
        phase: "question",
        currentRound: nextRoundNum,
        currentQuestion: nextQuestion,
        roundStartTime: null,
      };
    });
  }, []);

  const restartGame = useCallback(() => {
    if (!chatRef.current) return;
    initGame(chatRef.current);
  }, [initGame]);

  const reset = useCallback(() => {
    questionsRef.current = [];
    roundStartRef.current = 0;
    playerCountRef.current = 0;
    chatRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    initGame,
    addPlayer,
    removePlayer,
    startGame,
    showQuestion,
    submitAnswer,
    revealAnswer,
    showScores,
    nextRound,
    restartGame,
    reset,
  };
}
