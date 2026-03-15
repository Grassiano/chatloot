"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useRoomContext } from "@/components/room/room-provider";
import { useGame } from "@/hooks/use-game";
import { LobbyStep } from "@/components/game/lobby-step";
import { GameRound } from "@/components/game/game-round";
import { FinalResults } from "@/components/game/final-results";
import { ModeSelect } from "@/components/game/mode-select";
import { PlayerGameView } from "@/components/game/player-game-view";
import { getSessionId, clearLastRoom } from "@/lib/session";
import { buildBroadcast } from "@/lib/game/broadcast";
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

  // Track which players have answered (for broadcast + auto-reveal)
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<string[]>([]);
  const answeredIdsRef = useRef<string[]>([]);
  answeredIdsRef.current = answeredPlayerIds;
  const answeredCountRef = useRef(0);

  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    setMutedState(getMuted());
  }, []);

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  // Extract chat from wizardData.chatData (backend) or room.chatData (legacy)
  const resolvedChat = useMemo(() => {
    const wd = room?.wizardData as Record<string, unknown> | null;
    return (wd?.chatData as ParsedChat | null) ?? (room?.chatData as ParsedChat | null);
  }, [room]);

  // Initialize game from room data
  useEffect(() => {
    if (!room || initialized || !isGm || !resolvedChat) return;

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
      game.initGame(resolvedChat, undefined, questions);
    } else {
      game.initGame(resolvedChat);
    }

    // Both modes: auto-add joined room players with backend IDs and start
    const nonGm = players.filter((p) => !p.isGm);
    for (const p of nonGm) {
      game.addPlayer(p.name, p.id);
    }
    // Small delay to let state settle, then start
    setTimeout(() => game.startGame(), 50);

    setInitialized(true);
  }, [room, initialized, isGm, game, resolvedChat, players]);

  // Track last broadcast round to detect round changes and reset answered list
  const lastBroadcastRoundRef = useRef(0);

  // GM: Broadcast game state to backend on phase/round changes
  // Combined with answered-reset to prevent race conditions between separate effects
  useEffect(() => {
    if (!isGm || !initialized || !room) return;

    // Reset answered tracking when round changes
    let currentAnswered = answeredIdsRef.current;
    if (game.state.currentRound !== lastBroadcastRoundRef.current) {
      lastBroadcastRoundRef.current = game.state.currentRound;
      setAnsweredPlayerIds([]);
      answeredIdsRef.current = [];
      answeredCountRef.current = 0;
      currentAnswered = [];
    }

    const broadcast = buildBroadcast(game.state, currentAnswered);
    saveGameState(broadcast);
  // answeredPlayerIds intentionally omitted — broadcast only on phase/round changes.
  // Player answer tracking updates locally; no need to PATCH backend per answer.
  }, [game.state.phase, game.state.currentRound, isGm, initialized, room, saveGameState]);

  // GM: Track remote player answers via player_scored WS event
  // The useRoom hook already calls refreshPlayers() on player_scored.
  // We detect new answers by watching player score changes.
  const prevScoresRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!isGm || !initialized) return;
    const nonGm = players.filter((p) => !p.isGm);

    // Detect which players had a score change (= answered)
    const newAnswered: string[] = [];
    for (const p of nonGm) {
      const prevScore = prevScoresRef.current[p.id] ?? 0;
      if (p.score !== prevScore) {
        newAnswered.push(p.id);
      }
    }

    // Update prev scores
    const scores: Record<string, number> = {};
    for (const p of nonGm) {
      scores[p.id] = p.score;
    }
    prevScoresRef.current = scores;

    if (newAnswered.length > 0) {
      setAnsweredPlayerIds((prev) => {
        const set = new Set(prev);
        for (const id of newAnswered) set.add(id);
        return [...set];
      });
    }
  }, [players, isGm, initialized]);

  // GM: Auto-reveal when all remote players have answered
  useEffect(() => {
    if (!isGm || game.state.phase !== "answering") return;
    const nonGm = players.filter((p) => !p.isGm);
    if (nonGm.length === 0) return;
    if (answeredPlayerIds.length >= nonGm.length) {
      // All players answered — auto-reveal after short delay
      const id = setTimeout(() => game.revealAnswer(), 500);
      return () => clearTimeout(id);
    }
  }, [answeredPlayerIds.length, players, isGm, game]);

  const handleGameEnd = useCallback(async () => {
    clearLastRoom();
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

  // Player view — both modes use PlayerGameView
  if (!isGm) {
    return (
      <PlayerGameView
        room={room}
        players={players}
        sessionId={sessionId}
        hideQuestion={room.gameMode === "party"}
      />
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
          onClick={async () => {
            const isActiveGame = !["setup", "lobby", "final"].includes(phase);
            if (isActiveGame && !confirm("יציאה באמצע המשחק?")) return;
            await updatePhase("results");
            router.push("/");
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
          {phase === "setup" && resolvedChat && (
            <ModeSelect key="mode-select" onSelect={() => game.initGame(resolvedChat)} />
          )}
          {phase === "setup" && !resolvedChat && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
              <p className="text-[15px] text-[#9B96B0]">טוען נתוני צ׳אט...</p>
            </div>
          )}

          {phase === "lobby" && (
            <LobbyStep
              key="lobby"
              game={game}
              memberNames={
                resolvedChat?.members.map(
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
