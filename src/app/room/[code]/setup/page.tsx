"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoomContext } from "@/components/room/room-provider";
import { GmSetup } from "@/components/wizard/gm-setup";
import { roomApi } from "@/lib/room/api";
import { getSessionId } from "@/lib/session";
import type { ParsedChat } from "@/lib/parser/types";
import type { AnalysisResult } from "@/lib/ai/analyze-chat";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import { t } from "@/lib/i18n/he";

export default function RoomSetupPage() {
  const router = useRouter();
  const { room, isGm, isLoading, updatePhase, saveWizardData } =
    useRoomContext();
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Check if wizard was already completed (questions exist) — skip to lobby
  const wizardData = room?.wizardData as Record<string, unknown> | null;
  const isWizardComplete =
    Array.isArray(wizardData?.questions) &&
    (wizardData.questions as unknown[]).length > 0;

  useEffect(() => {
    if (!isLoading && room && isWizardComplete) {
      router.replace(`/room/${room.code}/lobby`);
    }
  }, [isLoading, room, isWizardComplete, router]);

  // Load chat data from wizard_data (stored there during room creation)
  useEffect(() => {
    if (!room) return;
    const wd = room.wizardData as Record<string, unknown> | null;
    if (wd?.chatData) {
      setChat(wd.chatData as ParsedChat);
    } else if (room.chatData) {
      setChat(room.chatData as ParsedChat);
    }
    if (room.analysisData) {
      setAnalysis(room.analysisData as AnalysisResult);
    }
  }, [room]);

  // Poll for AI analysis results (fires in background from create page)
  useEffect(() => {
    if (analysis || !room || !isGm) return;
    const sessionId = getSessionId();
    const id = setInterval(async () => {
      try {
        const fresh = await roomApi.getRoom(room.code, sessionId);
        if (fresh?.analysisData) {
          setAnalysis(fresh.analysisData as AnalysisResult);
        }
      } catch {
        // Polling failure is non-critical
      }
    }, 4000);
    return () => clearInterval(id);
  }, [analysis, room, isGm]);

  // Redirect non-GM users
  useEffect(() => {
    if (!isLoading && room && !isGm) {
      router.replace(`/room/${room.code}/lobby`);
    }
  }, [isLoading, room, isGm, router]);

  const handleWizardComplete = useCallback(
    async (questions: WhoSaidItQuestion[], memberPhotos: Map<string, string>) => {
      if (!room) return;

      const photosObj: Record<string, string> = {};
      memberPhotos.forEach((url, name) => {
        photosObj[name] = url;
      });

      const existingWd = (room.wizardData as Record<string, unknown>) ?? {};
      await saveWizardData({
        ...existingWd,
        questions,
        memberPhotos: photosObj,
      });

      await updatePhase("lobby");
      router.push(`/room/${room.code}/lobby`);
    },
    [room, saveWizardData, updatePhase, router]
  );

  if (isLoading || !room || isWizardComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <p className="text-loot-ink-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F0F2F5]">
        <p className="text-lg font-bold text-loot-ink">
          אין נתוני צ׳אט בחדר הזה
        </p>
        <button
          onClick={() => router.push("/room/create")}
          className="rounded-xl bg-[#8B5CF6] px-6 min-h-[44px] flex items-center justify-center font-bold text-white"
        >
          צרו משחק חדש
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <button
          onClick={() => router.push("/")}
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
          <p className="text-[11px] opacity-75">הכנת המשחק</p>
        </div>
        <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold">
          {room.code}
        </div>
      </header>

      <main className="flex-1">
        <GmSetup
          chat={chat}
          analysis={analysis}
          onComplete={handleWizardComplete}
        />
      </main>
    </div>
  );
}
