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

/** API contract — backend partner implements these endpoints */
export interface RoomAPI {
  createRoom(gmSessionId: string, groupName?: string): Promise<Room>;
  getRoom(code: string): Promise<Room | null>;
  updateRoom(code: string, data: Partial<Room>): Promise<Room>;
  joinRoom(
    code: string,
    name: string,
    sessionId: string
  ): Promise<RoomPlayer>;
  getPlayers(code: string): Promise<RoomPlayer[]>;
  removePlayer(code: string, playerId: string): Promise<void>;
  submitAnswer(
    code: string,
    playerId: string,
    roundNumber: number,
    answer: string,
    timeMs: number
  ): Promise<{ isCorrect: boolean; scoreAwarded: number }>;
  saveWizardData(code: string, data: unknown): Promise<void>;
  saveGameState(code: string, state: unknown): Promise<void>;
}
