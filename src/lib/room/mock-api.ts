/**
 * Mock API using localStorage — fully simulates the backend.
 * Backend partner replaces this with real API calls.
 */
import { generateRoomCode } from "./code";
import type { Room, RoomAPI, RoomPlayer } from "./types";
import { PLAYER_COLORS } from "@/lib/game/types";

const STORAGE_KEY = "chatloot_rooms";
const PLAYERS_KEY = "chatloot_room_players";

function getRooms(): Record<string, Room> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, Room>) : {};
}

function saveRooms(rooms: Record<string, Room>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function getPlayersMap(): Record<string, RoomPlayer[]> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, RoomPlayer[]>) : {};
}

function savePlayersMap(map: Record<string, RoomPlayer[]>): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(map));
}

export const mockRoomApi: RoomAPI = {
  async createRoom(gmSessionId, groupName) {
    const rooms = getRooms();
    let code = generateRoomCode();
    while (rooms[code]) {
      code = generateRoomCode();
    }

    const room: Room = {
      id: crypto.randomUUID(),
      code,
      phase: "setup",
      gameMode: null,
      gmSessionId,
      groupName: groupName ?? null,
      chatData: null,
      analysisData: null,
      wizardData: null,
      gameState: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    rooms[code] = room;
    saveRooms(rooms);

    // Add GM as first player
    const playersMap = getPlayersMap();
    playersMap[code] = [
      {
        id: crypto.randomUUID(),
        sessionId: gmSessionId,
        name: "מנחה",
        avatar: "🎯",
        color: PLAYER_COLORS[0],
        score: 0,
        streak: 0,
        isGm: true,
        joinedAt: new Date().toISOString(),
      },
    ];
    savePlayersMap(playersMap);

    return room;
  },

  async getRoom(code) {
    const rooms = getRooms();
    return rooms[code.toUpperCase()] ?? null;
  },

  async updateRoom(code, data) {
    const rooms = getRooms();
    const room = rooms[code.toUpperCase()];
    if (!room) throw new Error(`Room ${code} not found`);

    const updated = { ...room, ...data };
    rooms[code.toUpperCase()] = updated;
    saveRooms(rooms);
    return updated;
  },

  async joinRoom(code, name, sessionId) {
    const upperCode = code.toUpperCase();
    const rooms = getRooms();
    if (!rooms[upperCode]) throw new Error(`Room ${upperCode} not found`);

    const playersMap = getPlayersMap();
    const players = playersMap[upperCode] ?? [];

    // Check if already joined
    const existing = players.find((p) => p.sessionId === sessionId);
    if (existing) return existing;

    const playerIndex = players.length;
    const player: RoomPlayer = {
      id: crypto.randomUUID(),
      sessionId,
      name,
      avatar: name.charAt(0),
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      score: 0,
      streak: 0,
      isGm: false,
      joinedAt: new Date().toISOString(),
    };

    players.push(player);
    playersMap[upperCode] = players;
    savePlayersMap(playersMap);

    return player;
  },

  async getPlayers(code) {
    const playersMap = getPlayersMap();
    return playersMap[code.toUpperCase()] ?? [];
  },

  async removePlayer(code, playerId) {
    const playersMap = getPlayersMap();
    const upperCode = code.toUpperCase();
    const players = playersMap[upperCode] ?? [];
    playersMap[upperCode] = players.filter((p) => p.id !== playerId);
    savePlayersMap(playersMap);
  },

  async submitAnswer(_code, _playerId, _roundNumber, _answer, _timeMs) {
    // Stub — backend partner implements real scoring
    return { isCorrect: false, scoreAwarded: 0 };
  },

  async saveWizardData(code, data) {
    const rooms = getRooms();
    const upperCode = code.toUpperCase();
    if (!rooms[upperCode]) throw new Error(`Room ${upperCode} not found`);
    rooms[upperCode].wizardData = data;
    saveRooms(rooms);
  },

  async saveGameState(code, state) {
    const rooms = getRooms();
    const upperCode = code.toUpperCase();
    if (!rooms[upperCode]) throw new Error(`Room ${upperCode} not found`);
    rooms[upperCode].gameState = state;
    saveRooms(rooms);
  },
};
