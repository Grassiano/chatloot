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

// --- Question Types ---

export type QuestionType = "who_said_it" | "stat_trivia" | "emoji_match" | "true_false" | "word_cloud" | "time_guess" | "ghost_detective";

export interface WhoSaidItQuestion {
  type: "who_said_it";
  messageText: string;
  correctAuthor: string;
  correctAnswer: string;
  options: string[];
  timestamp: Date;
  gmNote?: string;
}

export interface StatTriviaQuestion {
  type: "stat_trivia";
  prompt: string;
  statValue: string;
  correctAnswer: string;
  options: string[];
  gmNote?: string;
}

export interface EmojiMatchQuestion {
  type: "emoji_match";
  prompt: string;
  targetEmoji?: string;
  targetMember?: string;
  correctAnswer: string;
  options: string[];
  gmNote?: string;
}

export interface TrueFalseQuestion {
  type: "true_false";
  statement: string;
  isTrue: boolean;
  correctAnswer: string;
  options: ["נכון", "לא נכון"];
  gmNote?: string;
}

export interface WordCloudQuestion {
  type: "word_cloud";
  prompt: string;
  targetWord: string;
  wordCount: number;
  correctAnswer: string;
  options: string[];
  gmNote?: string;
}

export interface TimeGuessQuestion {
  type: "time_guess";
  prompt: string;
  messageText: string;
  messageAuthor: string;
  correctAnswer: string;
  options: string[];
  gmNote?: string;
}

export interface GhostDetectiveQuestion {
  type: "ghost_detective";
  prompt: string;
  ghostDays: number;
  correctAnswer: string;
  options: string[];
  gmNote?: string;
}

export type GameQuestion =
  | WhoSaidItQuestion
  | StatTriviaQuestion
  | EmojiMatchQuestion
  | TrueFalseQuestion
  | WordCloudQuestion
  | TimeGuessQuestion
  | GhostDetectiveQuestion;

export interface RoundResult {
  roundNumber: number;
  question: GameQuestion;
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
  currentQuestion: GameQuestion | null;
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

export const MODE_EMOJIS: Record<GameMode, string> = {
  who_said_it: "🗣️",
  chat_awards: "🏆",
  time_machine: "⏰",
  caption_wars: "✍️",
  hot_seat: "🔥",
};

export const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  who_said_it: "נחשו מי כתב את ההודעה",
  chat_awards: "הצביעו על פרסים מביכים לחברי הקבוצה",
  time_machine: "נסעו אחורה בזמן — מתי זה נכתב?",
  caption_wars: "כתבו כיתוב מצחיק לתמונות מהצ׳אט",
  hot_seat: "שאלות אישיות על חברי הקבוצה",
};

export const AVAILABLE_MODES: GameMode[] = ["who_said_it"];

export const PLAYER_COLORS = [
  "#FBBF24",
  "#8B5CF6",
  "#FF6B6B",
  "#7C5CFC",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#8B5CF6",
];
