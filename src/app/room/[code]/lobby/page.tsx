"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRoomContext } from "@/components/room/room-provider";
import { QrCodeDisplay } from "@/components/room/qr-code";
import { PlayerList } from "@/components/room/player-list";
import { ModePicker } from "@/components/room/mode-picker";
import { getSessionId } from "@/lib/session";
import type { GameModeType } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { TextShimmer } from "@/components/ui/text-shimmer";

export default function RoomLobbyPage() {
  const router = useRouter();
  const { room, players, isGm, isLoading, updatePhase, setGameMode } =
    useRoomContext();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  const joinUrl =
    typeof window !== "undefined" && room
      ? `${window.location.origin}/join/${room.code}`
      : "";

  const nonGmPlayers = players.filter((p) => !p.isGm);
  const canStart = nonGmPlayers.length >= 1 && room?.gameMode !== null;

  const handleCopyCode = useCallback(async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room]);

  const handleShareLink = useCallback(async () => {
    if (!joinUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "ChatLoot - הצטרפו למשחק!",
        text: `הצטרפו למשחק ChatLoot! קוד חדר: ${room?.code}`,
        url: joinUrl,
      });
    } else {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [joinUrl, room]);

  const handleModeSelect = useCallback(
    async (mode: GameModeType) => {
      await setGameMode(mode);
    },
    [setGameMode]
  );

  const handleStartGame = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await updatePhase("playing");
      router.push(`/room/${room!.code}/game`);
    } catch {
      setIsStarting(false);
    }
  }, [updatePhase, router, room, isStarting]);

  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFE]">
        <p className="text-loot-ink-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F0FF] to-[#FAFAFE]">
      {/* Header */}
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <button
          onClick={() => {
            if (!isGm || confirm("לעזוב את הלובי? השחקנים יישארו בלי מנחה")) {
              router.push("/");
            }
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label={t("common.back")}
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
            {nonGmPlayers.length} {t("lobby.players").split(" ").pop()}
          </p>
        </div>
        <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold">
          {room.code}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6">
        <div className="w-full max-w-md space-y-6">
          {isGm ? (
            /* GM View */
            <>
              {/* QR + Code */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 rounded-2xl border border-white/30 bg-white/80 p-6 shadow-md backdrop-blur-md"
              >
                <h2 className="text-sm font-bold text-loot-ink">
                  {t("lobby.qr.title")}
                </h2>

                {joinUrl && <QrCodeDisplay url={joinUrl} size={180} />}

                {/* Room code */}
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-lg bg-[#F0EEFF] px-4 py-2 font-mono text-2xl font-black tracking-[0.2em] text-loot-ink"
                    dir="ltr"
                  >
                    {room.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="rounded-lg bg-[#F0EEFF] px-4 min-h-[44px] flex items-center text-xs font-medium text-loot-ink-secondary transition-colors hover:bg-[#E8E4F8]"
                  >
                    {copied ? t("room.copied") : t("room.copy_code")}
                  </button>
                </div>

                <button
                  onClick={handleShareLink}
                  className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 min-h-[44px] text-sm font-medium text-white transition-all hover:bg-[#7C3AED]"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  {t("room.share_link")}
                </button>
              </motion.div>

              {/* Mode picker */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ModePicker
                  selected={room.gameMode}
                  onSelect={handleModeSelect}
                />
              </motion.div>

              {/* Player list */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PlayerList players={players} sessionId={sessionId} />
              </motion.div>

              {/* Start button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-2 pt-2"
              >
                <button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] py-4 text-lg font-bold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                >
                  {isStarting ? "מתחילים..." : t("lobby.start")}
                </button>
                {!canStart && (
                  <p className="text-xs text-loot-ink-secondary">
                    {t("lobby.start_disabled")}
                  </p>
                )}
              </motion.div>
            </>
          ) : (
            /* Player View */
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 rounded-2xl border border-white/30 bg-white/80 p-8 text-center shadow-md backdrop-blur-md"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8B5CF6]/10 text-3xl">
                  ✓
                </div>
                <div>
                  <h2 className="text-xl font-bold text-loot-ink">
                    <VerticalCutReveal containerClassName="justify-center" staggerDuration={0.05}>
                      !אתם בפנים
                    </VerticalCutReveal>
                  </h2>
                  <div className="mt-1">
                    <TextShimmer className="text-sm text-loot-ink-secondary" duration={2.5} rtl>
                      {t("lobby.waiting")}
                    </TextShimmer>
                  </div>
                </div>
              </motion.div>

              <PlayerList players={players} sessionId={sessionId} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
