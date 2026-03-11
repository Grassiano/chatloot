"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useRoomContext } from "@/components/room/room-provider";
import { useGame } from "@/hooks/use-game";
import { LobbyStep } from "@/components/game/lobby-step";
import { GameRound } from "@/components/game/game-round";
import { FinalResults } from "@/components/game/final-results";
import { ModeSelect } from "@/components/game/mode-select";
import { SpectatorView } from "@/components/room/spectator-view";
import { getSessionId } from "@/lib/session";
import type { ParsedChat } from "@/lib/parser/types";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import { getMuted, setMuted } from "@/lib/sounds";
import { t } from "@/lib/i18n/he";

export default function RoomGamePage() {
  const router = useRouter();
  const { room, players, isGm, isLoading, updatePhase, saveGameState } =
    useRoomContext();
  const game = useGame();
  const [initialized, setInitialized] = useState(false);
  const [memberPhotos, setMemberPhotos] = useState<Map<string, string>>(
    new Map()
  );
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    setMutedState(getMuted());
  }, []);

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  // Initialize game from room data
  useEffect(() => {
    if (!room || initialized || !isGm) return;

    const chat = room.chatData as ParsedChat | null;
    if (!chat) return;

    // Restore wizard data
    const wizardData = room.wizardData as {
      questions?: WhoSaidItQuestion[];
      memberPhotos?: Record<string, string>;
    } | null;

    if (wizardData?.memberPhotos) {
      setMemberPhotos(new Map(Object.entries(wizardData.memberPhotos)));
    }

    const questions = wizardData?.questions ?? [];
    if (questions.length > 0) {
      game.initGame(chat, undefined, questions);
    } else {
      game.initGame(chat);
    }

    setInitialized(true);
  }, [room, initialized, isGm, game]);

  const handleGameEnd = useCallback(async () => {
    await updatePhase("results");
    await saveGameState({
      players: game.state.players,
      roundResults: game.state.roundResults.map((r) => ({
        ...r,
        answers: Object.fromEntries(r.answers),
      })),
    });
    router.push(`/room/${room!.code}/results`);
  }, [updatePhase, saveGameState, game.state, router, room]);

  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFE]">
        <p className="text-loot-ink-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  // Player in party mode — show spectator view
  if (!isGm && room.gameMode === "party") {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
          <div className="flex-1">
            <h1 className="text-[15px] font-medium">
              {room.groupName ?? "ChatLoot"}
            </h1>
            <p className="text-[11px] opacity-75">
              {t("spectator.title")}
            </p>
          </div>
        </header>
        <SpectatorView players={players} sessionId={sessionId} />
      </div>
    );
  }

  // Player in remote mode — TODO: implement player answer UI with real-time sync
  if (!isGm && room.gameMode === "remote") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0B1E] px-4">
        <div className="text-5xl mb-4">📱</div>
        <p className="text-xl font-bold text-white text-center">
          מצב מרחוק
        </p>
        <p className="mt-2 text-sm text-[#9B96B0] text-center">
          ייושם בקרוב — כרגע המשחק רץ על מסך המנחה
        </p>
      </div>
    );
  }

  // GM view — runs the actual game
  const { phase } = game.state;

  return (
    <div
      className="flex min-h-screen flex-col"
      data-mode={
        !["setup", "lobby"].includes(phase) ? "who-said-it" : undefined
      }
    >
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <button
          onClick={() => {
            const isActiveGame = !["setup", "lobby", "final"].includes(phase);
            if (isActiveGame && !confirm("יציאה באמצע המשחק?")) return;
            router.push(`/room/${room.code}/lobby`);
          }}
          aria-label={t("common.back")}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">
            {room.groupName ?? "ChatLoot"}
          </h1>
          <p className="text-[11px] opacity-75">
            {phase === "lobby" &&
              `${game.state.players.length} שחקנים`}
            {!["setup", "lobby"].includes(phase) &&
              `סיבוב ${game.state.currentRound} מתוך ${game.state.settings.totalRounds}`}
          </p>
        </div>
        <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold">
          {room.code}
        </div>
        <button
          onClick={toggleMute}
          aria-label={muted ? "הפעל צלילים" : "השתק צלילים"}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </header>

      <main className={`flex-1 ${phase === "lobby" ? "chat-wallpaper" : ""}`}>
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <ModeSelect key="mode-select" onSelect={() => game.initGame(room.chatData as ParsedChat)} />
          )}

          {phase === "lobby" && (
            <LobbyStep
              key="lobby"
              game={game}
              memberNames={
                (room.chatData as ParsedChat)?.members.map(
                  (m) => m.displayName
                ) ?? []
              }
            />
          )}

          {["question", "answering", "reveal", "scores"].includes(phase) && (
            <GameRound
              key={`round-${game.state.currentRound}`}
              game={game}
              memberPhotos={memberPhotos}
            />
          )}

          {phase === "final" && (
            <FinalResults
              key="final"
              game={game}
              memberPhotos={memberPhotos}
              groupName={room.groupName}
              onNewGame={handleGameEnd}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
