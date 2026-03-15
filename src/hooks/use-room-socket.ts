"use client";

import { useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const WS_URL = BACKEND_URL.replace(/^http/, "ws");

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

export interface WsEvent {
  type: string;
  payload: Record<string, unknown>;
}

type EventHandler = (event: WsEvent) => void;

interface UseRoomSocketOptions {
  roomCode: string | null;
  sessionId: string;
  onEvent: EventHandler;
  onReconnect?: () => void;
  enabled?: boolean;
}

export function useRoomSocket({
  roomCode,
  sessionId,
  onEvent,
  onReconnect,
  enabled = true,
}: UseRoomSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const hasConnectedOnce = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttempts.current = 0;
  }, []);

  const connect = useCallback(() => {
    if (!roomCode || !sessionId || !enabled) return;

    cleanup();

    const url = `${WS_URL}/ws/${roomCode}?session_id=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const wasReconnect = hasConnectedOnce.current;
      hasConnectedOnce.current = true;
      reconnectAttempts.current = 0;
      // On reconnect, refetch room state to catch any missed events
      if (wasReconnect && onReconnectRef.current) {
        onReconnectRef.current();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        onEventRef.current(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (enabled && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomCode, sessionId, enabled, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { send };
}
