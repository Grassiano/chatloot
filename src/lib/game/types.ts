export type GameMode =
  | "who_said_it"
  | "chat_awards"
  | "time_machine"
  | "caption_wars"
  | "hot_seat";

export type GamePhase =
  | "setup"
  | "lobby"
  | "question"
  | "answering"
  | "reveal"
  | "scores"
  | "final";

export interface GameSettings {
  mode: GameMode;
  totalRounds: number;
  timerSeconds: number;
  showAuthorHint: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // first letter or emoji
  color: string;
  score: number;
  streak: number;
}

export interface WhoSaidItQuestion {
  messageText: string;
  correctAuthor: string;
  options: string[]; // 4 options including correct
  timestamp: Date;
  gmNote?: string;
}

export interface RoundResult {
  roundNumber: number;
  question: WhoSaidItQuestion;
  answers: Map<string, PlayerAnswer>;
}

export interface PlayerAnswer {
  playerId: string;
  answer: string;
  isCorrect: boolean;
  timeMs: number;
  scoreAwarded: number;
}

export interface GameState {
  settings: GameSettings;
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  currentQuestion: WhoSaidItQuestion | null;
  roundResults: RoundResult[];
  roundStartTime: number | null;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "who_said_it",
  totalRounds: 10,
  timerSeconds: 15,
  showAuthorHint: false,
};

export const MODE_LABELS: Record<GameMode, string> = {
  who_said_it: "מי אמר?",
  chat_awards: "פרסי הקבוצה",
  time_machine: "מכונת הזמן",
  caption_wars: "קרב כיתובים",
  hot_seat: "הכיסא החם",
};

export const PLAYER_COLORS = [
  "#E2A829",
  "#00A884",
  "#FF6B6B",
  "#7C5CFC",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#8B5CF6",
];
