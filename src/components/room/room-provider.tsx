"use client";

import { createContext, useContext, useEffect } from "react";
import { useRoom } from "@/hooks/use-room";

type RoomContextValue = ReturnType<typeof useRoom>;

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoomContext must be used within a RoomProvider");
  }
  return ctx;
}

interface RoomProviderProps {
  code: string;
  children: React.ReactNode;
}

export function RoomProvider({ code, children }: RoomProviderProps) {
  const room = useRoom();

  useEffect(() => {
    room.fetchRoom(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}
