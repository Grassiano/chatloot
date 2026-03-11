"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { roomApi } from "@/lib/room/api";
import { getSessionId } from "@/lib/session";
import type { Room } from "@/lib/room/types";
import { t } from "@/lib/i18n/he";

interface JoinWithCodePageProps {
  params: Promise<{ code: string }>;
}

export default function JoinWithCodePage({ params }: JoinWithCodePageProps) {
  const { code } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkRoom() {
      try {
        const found = await roomApi.getRoom(code);
        if (found) {
          setRoom(found);

          // Check if already joined
          const sessionId = getSessionId();
          const players = await roomApi.getPlayers(code);
          const existing = players.find((p) => p.sessionId === sessionId);
          if (existing) {
            // Already in the room — go to lobby
            router.replace(`/room/${code}/lobby`);
            return;
          }
        } else {
          setError(t("room.not_found"));
        }
      } catch {
        setError(t("room.not_found"));
      }
      setIsLoading(false);
    }
    checkRoom();
  }, [code, router]);

  async function handleJoin() {
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed || !room) return;

    setIsJoining(true);
    try {
      const sessionId = getSessionId();
      await roomApi.joinRoom(code, trimmed, sessionId);
      router.push(`/room/${code}/lobby`);
    } catch {
      setError("שגיאה בהצטרפות");
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFE]">
        <p className="text-loot-ink-secondary">{t("join.checking")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFE]">
        <p className="text-xl font-bold text-loot-ink">{error}</p>
        <Link
          href="/join"
          className="rounded-xl bg-[#8B5CF6] px-6 min-h-[44px] flex items-center justify-center font-bold text-white"
        >
          נסו קוד אחר
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F0FF] to-[#FAFAFE]">
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/join"
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label={t("common.back")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">{t("join.title")}</h1>
          <p className="text-[11px] opacity-75">
            {t("join.room_info")} {room?.groupName ?? code}
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Room info card */}
          <div className="rounded-2xl border border-white/30 bg-white/80 p-6 text-center shadow-md backdrop-blur-md">
            <div className="mb-3 text-4xl">🎮</div>
            <p className="text-lg font-bold text-loot-ink">
              {room?.groupName ?? "משחק ChatLoot"}
            </p>
            <p className="mt-1 text-sm text-loot-ink-secondary">
              {t("room.code")}: <span className="font-mono font-bold">{code}</span>
            </p>
          </div>

          {/* Name input */}
          <div className="space-y-3">
            <label className="block text-center text-sm font-medium text-loot-ink">
              {t("join.enter_name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder={t("join.name_placeholder")}
              className="w-full rounded-xl border border-white/50 bg-white/80 px-4 py-4 text-center text-lg font-medium text-loot-ink placeholder:text-loot-ink-secondary focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
              autoFocus
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || isJoining}
            className="w-full rounded-xl bg-[#8B5CF6] py-4 text-lg font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            {isJoining ? t("common.loading") : t("join.button")}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
