import type { GameState, GameQuestion } from "./types";

/** Game state broadcast to all players via WebSocket (saved as room.gameState) */
export interface BroadcastGameState {
  phase: "waiting" | "question" | "answering" | "reveal" | "scores" | "final";
  currentRound: number;
  totalRounds: number;
  timerSeconds: number;
  roundStartedAt: number | null;
  question: BroadcastQuestion | null;
  correctAnswer: string | null;
  players: BroadcastPlayer[];
  answeredPlayerIds: string[];
  playerResults: Record<
    string,
    { isCorrect: boolean; scoreAwarded: number }
  > | null;
}

export interface BroadcastQuestion {
  type: string;
  prompt: string;
  options: string[];
  messageText?: string;
  statement?: string;
  targetEmoji?: string;
  targetWord?: string;
  wordCount?: number;
  ghostDays?: number;
  messageAuthor?: string;
}

export interface BroadcastPlayer {
  id: string;
  name: string;
  score: number;
  color: string;
  avatar: string;
}

function serializeQuestion(q: GameQuestion): BroadcastQuestion {
  const base: BroadcastQuestion = {
    type: q.type,
    prompt: "prompt" in q ? q.prompt : "",
    options: q.options,
  };

  if (q.type === "who_said_it" || q.type === "time_guess") {
    base.messageText = q.messageText;
  }
  if (q.type === "true_false") {
    base.statement = q.statement;
  }
  if (q.type === "emoji_match" && q.targetEmoji) {
    base.targetEmoji = q.targetEmoji;
  }
  if (q.type === "word_cloud") {
    base.targetWord = q.targetWord;
    base.wordCount = q.wordCount;
  }
  if (q.type === "ghost_detective") {
    base.ghostDays = q.ghostDays;
  }
  if (q.type === "time_guess") {
    base.messageAuthor = q.messageAuthor;
  }

  return base;
}

/** Build a BroadcastGameState from the GM's local game state */
export function buildBroadcast(
  state: GameState,
  answeredPlayerIds: string[]
): BroadcastGameState {
  const isReveal = state.phase === "reveal";
  const isFinal = state.phase === "final";
  const q = state.currentQuestion;

  // Build player results for reveal phase
  let playerResults: BroadcastGameState["playerResults"] = null;
  if (isReveal && q) {
    const roundResult = state.roundResults.find(
      (r) => r.roundNumber === state.currentRound
    );
    if (roundResult) {
      playerResults = {};
      for (const [playerId, answer] of roundResult.answers) {
        playerResults[playerId] = {
          isCorrect: answer.isCorrect,
          scoreAwarded: answer.scoreAwarded,
        };
      }
    }
  }

  return {
    phase: state.phase === "setup" || state.phase === "lobby"
      ? "waiting"
      : state.phase as BroadcastGameState["phase"],
    currentRound: state.currentRound,
    totalRounds: state.settings.totalRounds,
    timerSeconds: state.settings.timerSeconds,
    roundStartedAt: state.roundStartTime,
    question: q ? serializeQuestion(q) : null,
    // Always include correctAnswer — backend needs it for answer scoring.
    // The backend strips it from the WebSocket broadcast for non-reveal phases.
    correctAnswer: q?.correctAnswer ?? null,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color,
      avatar: p.avatar,
    })),
    answeredPlayerIds,
    playerResults,
  };
}
