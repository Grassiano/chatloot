/**
 * Room API — real HTTP client that talks to the FastAPI backend.
 * Backend returns snake_case, frontend uses camelCase — we map at the boundary.
 */
import type { Room, RoomAPI, RoomPlayer } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function toRoom(data: Record<string, unknown>): Room {
  return {
    id: data.id as string,
    code: data.code as string,
    phase: data.phase as Room["phase"],
    gameMode: (data.game_mode as Room["gameMode"]) ?? null,
    gmSessionId: data.gm_session_id as string,
    groupName: (data.group_name as string) ?? null,
    chatData: (data.chat_data as unknown) ?? null,
    analysisData: (data.analysis_data as unknown) ?? null,
    wizardData: (data.wizard_data as unknown) ?? null,
    gameState: (data.game_state as unknown) ?? null,
    createdAt: data.created_at as string,
    expiresAt: data.expires_at as string,
  };
}

function toPlayer(data: Record<string, unknown>): RoomPlayer {
  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    name: data.name as string,
    avatar: (data.avatar as string) ?? "",
    color: data.color as string,
    score: (data.score as number) ?? 0,
    streak: (data.streak as number) ?? 0,
    isGm: (data.is_gm as boolean) ?? false,
    joinedAt: data.joined_at as string,
  };
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const roomApi: RoomAPI = {
  async createRoom(gmSessionId, groupName, file) {
    if (!file) {
      throw new Error("File is required to create a room via the backend");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("gm_session_id", gmSessionId);
    if (groupName) formData.append("group_name", groupName);

    const data = await apiFetch<{ room_code: string; group_name: string | null }>(
      "/rooms/upload",
      { method: "POST", body: formData },
    );

    // Fetch the full room object after creation
    const roomData = await apiFetch<Record<string, unknown>>(
      `/rooms/${data.room_code}?session_id=${encodeURIComponent(gmSessionId)}`,
    );

    return toRoom(roomData);
  },

  async getRoom(code, sessionId) {
    try {
      const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
      const data = await apiFetch<Record<string, unknown>>(`/rooms/${code}${query}`);
      return toRoom(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return null;
      throw err;
    }
  },

  async updateRoom(code, data) {
    const body: Record<string, unknown> = {};
    if (data.phase !== undefined) body.phase = data.phase;
    if (data.gameMode !== undefined) body.game_mode = data.gameMode;
    if (data.wizardData !== undefined) body.wizard_data = data.wizardData;
    if (data.gameState !== undefined) body.game_state = data.gameState;
    if (data.analysisData !== undefined) body.analysis_data = data.analysisData;

    const res = await apiFetch<Record<string, unknown>>(`/rooms/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return toRoom(res);
  },

  async joinRoom(code, name, sessionId) {
    const data = await apiFetch<Record<string, unknown>>(`/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, name }),
    });

    return toPlayer(data);
  },

  async getPlayers(code) {
    const data = await apiFetch<Record<string, unknown>[]>(`/rooms/${code}/players`);
    return data.map(toPlayer);
  },

  async removePlayer(code, playerId) {
    await apiFetch(`/rooms/${code}/players/${playerId}`, { method: "DELETE" });
  },

  async submitAnswer(code, playerId, _roundNumber, answer, timeMs) {
    const data = await apiFetch<{ is_correct: boolean; score_awarded: number }>(
      `/rooms/${code}/answers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          answer,
          time_ms: timeMs,
        }),
      },
    );

    return { isCorrect: data.is_correct, scoreAwarded: data.score_awarded };
  },

  async saveWizardData(code, data) {
    await apiFetch(`/rooms/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wizard_data: data }),
    });
  },

  async saveGameState(code, state) {
    await apiFetch(`/rooms/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_state: state }),
    });
  },
};
