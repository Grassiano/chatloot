"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { roomApi } from "@/lib/room/api";
import { getSessionId } from "@/lib/session";
import type { Room, RoomPlayer, GameModeType } from "@/lib/room/types";

interface UseRoomReturn {
  room: Room | null;
  players: RoomPlayer[];
  currentPlayer: RoomPlayer | null;
  isGm: boolean;
  isLoading: boolean;
  error: string | null;
  createRoom: (groupName?: string) => Promise<Room>;
  joinRoom: (code: string, name: string) => Promise<RoomPlayer>;
  fetchRoom: (code: string) => Promise<void>;
  updatePhase: (phase: Room["phase"]) => Promise<void>;
  setGameMode: (mode: GameModeType) => Promise<void>;
  saveWizardData: (data: unknown) => Promise<void>;
  saveGameState: (state: unknown) => Promise<void>;
  refreshPlayers: () => Promise<void>;
}

export function useRoom(): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>(null);

  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  const currentPlayer = players.find((p) => p.sessionId === sessionId) ?? null;
  const isGm = room?.gmSessionId === sessionId;

  const refreshPlayers = useCallback(async () => {
    if (!room) return;
    try {
      const updated = await roomApi.getPlayers(room.code);
      setPlayers(updated);
    } catch {
      // Silently fail on polling errors
    }
  }, [room]);

  // Poll for players while in lobby
  useEffect(() => {
    if (!room || room.phase !== "lobby") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    refreshPlayers();
    pollingRef.current = setInterval(refreshPlayers, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [room, room?.phase, refreshPlayers]);

  const createRoom = useCallback(
    async (groupName?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const newRoom = await roomApi.createRoom(sessionId, groupName);
        setRoom(newRoom);
        const roomPlayers = await roomApi.getPlayers(newRoom.code);
        setPlayers(roomPlayers);
        return newRoom;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create room";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const fetchRoom = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await roomApi.getRoom(code);
      if (!fetched) {
        setError("room_not_found");
        return;
      }
      setRoom(fetched);
      const roomPlayers = await roomApi.getPlayers(code);
      setPlayers(roomPlayers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch room";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const player = await roomApi.joinRoom(code, name, sessionId);
        const roomPlayers = await roomApi.getPlayers(code);
        setPlayers(roomPlayers);
        return player;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to join room";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const updatePhase = useCallback(
    async (phase: Room["phase"]) => {
      if (!room) return;
      const updated = await roomApi.updateRoom(room.code, { phase });
      setRoom(updated);
    },
    [room]
  );

  const setGameMode = useCallback(
    async (mode: GameModeType) => {
      if (!room) return;
      const updated = await roomApi.updateRoom(room.code, { gameMode: mode });
      setRoom(updated);
    },
    [room]
  );

  const saveWizardData = useCallback(
    async (data: unknown) => {
      if (!room) return;
      await roomApi.saveWizardData(room.code, data);
    },
    [room]
  );

  const saveGameState = useCallback(
    async (state: unknown) => {
      if (!room) return;
      await roomApi.saveGameState(room.code, state);
    },
    [room]
  );

  return {
    room,
    players,
    currentPlayer,
    isGm,
    isLoading,
    error,
    createRoom,
    joinRoom,
    fetchRoom,
    updatePhase,
    setGameMode,
    saveWizardData,
    saveGameState,
    refreshPlayers,
  };
}
