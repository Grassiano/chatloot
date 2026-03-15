export type RoomPhase = "setup" | "lobby" | "playing" | "results";
export type GameModeType = "party" | "remote";

export interface Room {
  id: string;
  code: string;
  phase: RoomPhase;
  gameMode: GameModeType | null;
  gmSessionId: string;
  groupName: string | null;
  chatData: unknown | null;
  analysisData: unknown | null;
  wizardData: unknown | null;
  gameState: unknown | null;
  createdAt: string;
  expiresAt: string;
}

export interface RoomPlayer {
  id: string;
  sessionId: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  streak: number;
  isGm: boolean;
  joinedAt: string;
}

/** API contract — matches the FastAPI backend endpoints */
export interface RoomAPI {
  createRoom(gmSessionId: string, groupName?: string, file?: File | Blob): Promise<Room>;
  getRoom(code: string, sessionId?: string): Promise<Room | null>;
  updateRoom(code: string, data: Partial<Room>, sessionId: string): Promise<Room>;
  joinRoom(
    code: string,
    name: string,
    sessionId: string
  ): Promise<RoomPlayer>;
  getPlayers(code: string): Promise<RoomPlayer[]>;
  removePlayer(code: string, playerId: string, sessionId: string): Promise<void>;
  submitAnswer(
    code: string,
    playerId: string,
    sessionId: string,
    roundNumber: number,
    answer: string,
    timeMs: number
  ): Promise<{ isCorrect: boolean; scoreAwarded: number }>;
  saveWizardData(code: string, data: unknown, sessionId: string): Promise<void>;
  saveGameState(code: string, state: unknown, sessionId: string): Promise<void>;
}
