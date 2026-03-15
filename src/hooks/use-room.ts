"use client";

import { useState, useCallback, useRef } from "react";
import { roomApi } from "@/lib/room/api";
import { getSessionId } from "@/lib/session";
import { useRoomSocket, type WsEvent } from "./use-room-socket";
import type { Room, RoomPlayer, GameModeType } from "@/lib/room/types";

interface UseRoomReturn {
  room: Room | null;
  players: RoomPlayer[];
  currentPlayer: RoomPlayer | null;
  isGm: boolean;
  isLoading: boolean;
  error: string | null;
  createRoom: (groupName?: string, file?: File | Blob) => Promise<Room>;
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
  const roomRef = useRef<Room | null>(null);

  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  const currentPlayer = players.find((p) => p.sessionId === sessionId) ?? null;
  const isGm = room?.gmSessionId === sessionId;

  const refreshPlayers = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const updated = await roomApi.getPlayers(roomRef.current.code);
      setPlayers(updated);
    } catch {
      // Silently fail
    }
  }, []);

  // Handle real-time WebSocket events from backend
  const handleWsEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case "player_joined": {
        // Use WS payload directly instead of refetching
        const p = event.payload as Record<string, unknown>;
        const newPlayer: RoomPlayer = {
          id: p.id as string,
          sessionId: (p.sessionId as string) ?? "",
          name: p.name as string,
          avatar: (p.avatar as string) ?? "",
          color: p.color as string,
          score: (p.score as number) ?? 0,
          streak: (p.streak as number) ?? 0,
          isGm: (p.isGm as boolean) ?? false,
          joinedAt: new Date().toISOString(),
        };
        setPlayers((prev) => {
          // Avoid duplicates on re-join
          if (prev.some((existing) => existing.id === newPlayer.id)) return prev;
          return [...prev, newPlayer];
        });
        break;
      }
      case "phase_change": {
        const phase = event.payload.phase as Room["phase"];
        setRoom((prev) => (prev ? { ...prev, phase } : prev));
        break;
      }
      case "game_state_update": {
        setRoom((prev) =>
          prev ? { ...prev, gameState: event.payload } : prev,
        );
        break;
      }
      case "player_scored": {
        // Use WS payload directly — update score in place
        const { playerId, score } = event.payload as { playerId: string; score: number };
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, score } : p))
        );
        break;
      }
    }
  }, []);

  // Refetch full room state on WebSocket reconnect to catch missed events
  const handleReconnect = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const fetched = await roomApi.getRoom(roomRef.current.code, sessionId);
      if (fetched) {
        roomRef.current = fetched;
        setRoom(fetched);
      }
      const updated = await roomApi.getPlayers(roomRef.current.code);
      setPlayers(updated);
    } catch {
      // Silently fail — will get next WS event
    }
  }, [sessionId]);

  // Connect WebSocket when we have a room
  useRoomSocket({
    roomCode: room?.code ?? null,
    sessionId,
    onEvent: handleWsEvent,
    onReconnect: handleReconnect,
    enabled: !!room,
  });

  const createRoom = useCallback(
    async (groupName?: string, file?: File | Blob) => {
      setIsLoading(true);
      setError(null);
      try {
        const newRoom = await roomApi.createRoom(sessionId, groupName, file);
        roomRef.current = newRoom;
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
      const fetched = await roomApi.getRoom(code, sessionId);
      if (!fetched) {
        setError("room_not_found");
        return;
      }
      roomRef.current = fetched;
      setRoom(fetched);
      const roomPlayers = await roomApi.getPlayers(code);
      setPlayers(roomPlayers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch room";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

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

  // Backend RoomOut response only returns core fields (id, code, phase, etc.)
  // and omits game_mode, wizard_data, analysis_data, game_state.
  // So we optimistically update local state and only take core fields from response.

  const updatePhase = useCallback(
    async (phase: Room["phase"]) => {
      if (!roomRef.current) return;
      await roomApi.updateRoom(roomRef.current.code, { phase }, sessionId);
      const merged = { ...roomRef.current, phase };
      roomRef.current = merged;
      setRoom(merged);
    },
    [sessionId]
  );

  const setGameMode = useCallback(
    async (mode: GameModeType) => {
      if (!roomRef.current) return;
      await roomApi.updateRoom(roomRef.current.code, { gameMode: mode }, sessionId);
      const merged = { ...roomRef.current, gameMode: mode };
      roomRef.current = merged;
      setRoom(merged);
    },
    [sessionId]
  );

  const saveWizardData = useCallback(
    async (data: unknown) => {
      if (!roomRef.current) return;
      await roomApi.saveWizardData(roomRef.current.code, data, sessionId);
      const merged = { ...roomRef.current, wizardData: data };
      roomRef.current = merged;
      setRoom(merged);
    },
    [sessionId]
  );

  const saveGameState = useCallback(
    async (state: unknown) => {
      if (!roomRef.current) return;
      await roomApi.saveGameState(roomRef.current.code, state, sessionId);
      const merged = { ...roomRef.current, gameState: state };
      roomRef.current = merged;
      setRoom(merged);
    },
    [sessionId]
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
