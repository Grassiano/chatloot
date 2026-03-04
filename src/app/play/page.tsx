"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/hooks/use-game";
import type { ParsedChat } from "@/lib/parser/types";
import type { MediaFile } from "@/lib/parser/types";
import { extractUpload, revokeMediaUrls } from "@/lib/parser/extract-files";
import { parseWhatsAppChat } from "@/lib/parser/parse-chat";
import { analyzeChat } from "@/lib/ai/analyze-chat";
import { UploadStep } from "@/components/game/upload-step";
import { LobbyStep } from "@/components/game/lobby-step";
import { GameRound } from "@/components/game/game-round";
import { FinalResults } from "@/components/game/final-results";
import Link from "next/link";

type AnalysisState = "idle" | "analyzing" | "done" | "failed" | "skipped";

export default function PlayPage() {
  const game = useGame();
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);
  const mediaRef = useRef<Map<string, MediaFile> | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRef.current) revokeMediaUrls(mediaRef.current);
    };
  }, []);

  async function handleUpload(input: File | FileList) {
    if (mediaRef.current) revokeMediaUrls(mediaRef.current);
    const extracted = await extractUpload(input);
    mediaRef.current = extracted.media;
    const parsed = await parseWhatsAppChat(
      extracted.chatText,
      extracted.media
    );
    setChat(parsed);
    setAnalysisState("analyzing");

    // Run AI analysis
    try {
      const result = await analyzeChat(parsed);
      if (result.isAiEnhanced && result.questions.length > 0) {
        game.initGame(parsed, undefined, result.questions);
        setIsAiEnhanced(true);
        setAnalysisState("done");
      } else {
        // AI returned nothing useful — fall back to random
        game.initGame(parsed);
        setIsAiEnhanced(false);
        setAnalysisState("failed");
      }
    } catch {
      // AI failed — fall back to random
      game.initGame(parsed);
      setIsAiEnhanced(false);
      setAnalysisState("failed");
    }
  }

  function handleSkipAi() {
    if (!chat) return;
    game.initGame(chat);
    setIsAiEnhanced(false);
    setAnalysisState("skipped");
  }

  const { phase } = game.state;
  const showAnalyzing = phase === "setup" && analysisState === "analyzing";

  return (
    <div
      className="flex min-h-screen flex-col"
      data-mode={
        phase === "setup" || phase === "lobby" ? undefined : "who-said-it"
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">ChatLoot</h1>
          <p className="text-[11px] opacity-75">
            {phase === "setup" && !showAnalyzing && "העלאת צ׳אט"}
            {showAnalyzing && "מנתח את הצ׳אט..."}
            {phase === "lobby" &&
              `${game.state.players.length} שחקנים מחוברים`}
            {!["setup", "lobby"].includes(phase) &&
              `סיבוב ${game.state.currentRound} מתוך ${game.state.settings.totalRounds}`}
          </p>
        </div>
        {phase !== "setup" && phase !== "lobby" && phase !== "final" && (
          <div className="text-[13px] font-bold tabular-nums">מי אמר?</div>
        )}
        {isAiEnhanced &&
          phase !== "setup" &&
          phase !== "final" && (
            <div className="rounded-full bg-[#E2A829]/20 px-2 py-0.5 text-[10px] font-bold text-[#E2A829]">
              AI
            </div>
          )}
      </header>

      <main
        className={`flex-1 ${phase === "setup" && !showAnalyzing ? "chat-wallpaper" : ""}`}
      >
        <AnimatePresence mode="wait">
          {phase === "setup" && !showAnalyzing && (
            <UploadStep key="upload" onUpload={handleUpload} />
          )}

          {showAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center bg-[#0D1117] px-4"
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
                🔍
              </motion.div>
              <p className="mb-2 text-[18px] font-bold text-white">
                הבינה המלאכותית קוראת את הצ׳אט...
              </p>
              <p className="mb-8 text-[14px] text-[#8B949E]">
                מחפשת את ההודעות הכי שוות למשחק
              </p>
              <button
                onClick={handleSkipAi}
                className="rounded-lg bg-[#21262D] px-4 py-2 text-[13px] text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-white"
              >
                דלגו ושחקו עם בחירה רנדומלית
              </button>
            </motion.div>
          )}

          {phase === "lobby" && chat && (
            <LobbyStep
              key="lobby"
              game={game}
              memberNames={chat.members.map((m) => m.displayName)}
            />
          )}

          {["question", "answering", "reveal", "scores"].includes(phase) && (
            <GameRound
              key={`round-${game.state.currentRound}`}
              game={game}
            />
          )}

          {phase === "final" && <FinalResults key="final" game={game} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
