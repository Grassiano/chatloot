"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UploadStep } from "@/components/game/upload-step";
import { extractUpload, revokeMediaUrls } from "@/lib/parser/extract-files";
import { parseWhatsAppChat } from "@/lib/parser/parse-chat";
import { analyzeChat } from "@/lib/ai/analyze-chat";
import { roomApi } from "@/lib/room/api";
import { getSessionId, saveLastRoom } from "@/lib/session";
import type { ParsedChat, MediaFile, ExtractionProgress } from "@/lib/parser/types";
import { t } from "@/lib/i18n/he";

type CreatePhase = "upload" | "creating" | "error";

export default function RoomCreatePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<CreatePhase>("upload");
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress | null>(null);
  const [error, setError] = useState("");
  const mediaRef = useRef<Map<string, MediaFile> | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRef.current) revokeMediaUrls(mediaRef.current);
    };
  }, []);

  const handleUpload = useCallback(
    async (input: File | FileList) => {
      try {
        if (mediaRef.current) revokeMediaUrls(mediaRef.current);
        const extracted = await extractUpload(input, setExtractionProgress);
        mediaRef.current = extracted.media;

        const uploadName =
          input instanceof File
            ? input.name
            : input.length > 0
              ? (input[0].webkitRelativePath?.split("/")[0] ?? input[0].name)
              : undefined;

        const parsed: ParsedChat = await parseWhatsAppChat(
          extracted.chatText,
          extracted.media,
          uploadName
        );

        if (parsed.members.length < 2 || parsed.stats.totalMessages < 10) {
          throw new Error("no_eligible_messages");
        }

        // Get the original file to send to the backend
        const uploadFile = input instanceof File ? input : input[0];

        // Create room via backend (sends file for server-side parsing)
        setPhase("creating");
        const sessionId = getSessionId();
        const room = await roomApi.createRoom(
          sessionId,
          parsed.groupName ?? undefined,
          uploadFile,
        );
        // Save parsed chat to wizard_data so the setup page can access it
        const serializableChat = {
          ...parsed,
          media: Object.fromEntries(
            Array.from(parsed.media.entries()).map(([k, v]) => [
              k,
              { fileName: v.fileName, type: v.type },
            ]),
          ),
          stats: {
            ...parsed.stats,
            members: Object.fromEntries(parsed.stats.members),
          },
        };
        await roomApi.saveWizardData(room.code, { chatData: serializableChat });
        saveLastRoom(room.code);

        // Fire AI analysis in background — don't block navigation
        analyzeChat(parsed).then(async (result) => {
          if (result?.isAiEnhanced) {
            await roomApi.updateRoom(room.code, { analysisData: result });
          }
        }).catch(() => {});

        // Navigate immediately — wizard starts without AI
        router.push(`/room/${room.code}/setup`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        const errorMap: Record<string, string> = {
          no_eligible_messages: "לא נמצאו מספיק הודעות טקסט למשחק",
          no_chat_file: "לא נמצא קובץ צ׳אט בתוך ה-ZIP או התיקייה",
          unsupported_file_type: "סוג קובץ לא נתמך — העלו קובץ ZIP או TXT",
          no_messages_parsed: "לא הצלחתי לזהות הודעות — ודאו שזה ייצוא צ׳אט מוואטסאפ",
        };
        setError(errorMap[message] ?? "משהו השתבש — נסו שוב");
        setPhase("error");
      }
    },
    [router]
  );

  function handleRetry() {
    setError("");
    setPhase("upload");
    setExtractionProgress(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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
          <h1 className="text-[15px] font-medium">ChatLoot</h1>
          <p className="text-[11px] opacity-75">
            {phase === "upload" && "יצירת משחק חדש"}
            {phase === "creating" && t("room.creating")}
            {phase === "error" && "שגיאה"}
          </p>
        </div>
      </header>

      <main className={`flex-1 ${phase === "upload" || phase === "error" ? "chat-wallpaper" : ""}`}>
        <AnimatePresence mode="wait">
          {(phase === "upload" || phase === "error") && (
            <UploadStep
              key="upload"
              onUpload={handleUpload}
              extractionProgress={extractionProgress}
            />
          )}

          {phase === "creating" && (
            <motion.div
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center bg-[#0F0B1E] px-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="mb-6 text-[48px]"
              >
                💬
              </motion.div>
              <p className="mb-2 text-[18px] font-bold text-white">
                {t("room.creating")}
              </p>
              <p className="text-[14px] text-[#9B96B0]">מנתח את הצ׳אט...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        {phase === "error" && error && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
              <div className="mb-3 text-[40px]">😕</div>
              <p className="mb-4 text-[15px] font-medium text-[#1E1B3A]">{error}</p>
              <button
                onClick={handleRetry}
                className="rounded-xl bg-[#8B5CF6] px-6 py-3 text-[14px] font-bold text-white transition-transform active:scale-95"
              >
                נסו שוב
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
