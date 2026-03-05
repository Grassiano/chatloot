"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/hooks/use-game";
import type { ParsedChat, MediaFile, ExtractionProgress } from "@/lib/parser/types";
import type { WhoSaidItQuestion } from "@/lib/game/types";
import type { AnalysisResult } from "@/lib/ai/analyze-chat";
import { extractUpload, revokeMediaUrls } from "@/lib/parser/extract-files";
import { parseWhatsAppChat } from "@/lib/parser/parse-chat";
import { analyzeChat } from "@/lib/ai/analyze-chat";
import { UploadStep } from "@/components/game/upload-step";
import { LobbyStep } from "@/components/game/lobby-step";
import { GameRound } from "@/components/game/game-round";
import { FinalResults } from "@/components/game/final-results";
import { GmSetup } from "@/components/wizard/gm-setup";
import { ModeSelect } from "@/components/game/mode-select";
import Link from "next/link";

type FlowPhase = "upload" | "analyzing" | "wizard" | "mode-select" | "game";

const LOADING_MESSAGES = [
  "קורא את כל ההודעות...",
  "מחפש את הרגעים המביכים...",
  "לומד מי כותב מה...",
  "בוחר את השאלות הכי טובות...",
  "כותב פרופיל לכל חבר...",
];

export default function PlayPage() {
  const game = useGame();
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("upload");
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [memberPhotos, setMemberPhotos] = useState<Map<string, string>>(
    new Map()
  );
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress | null>(null);
  const mediaRef = useRef<Map<string, MediaFile> | null>(null);
  const wizardQuestionsRef = useRef<WhoSaidItQuestion[]>([]);

  // Cleanup media URLs on unmount
  useEffect(() => {
    return () => {
      if (mediaRef.current) revokeMediaUrls(mediaRef.current);
    };
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (flowPhase !== "analyzing") return;
    const timer = setInterval(() => {
      setLoadingMsg((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [flowPhase]);

  async function handleUpload(input: File | FileList) {
    if (mediaRef.current) revokeMediaUrls(mediaRef.current);
    const extracted = await extractUpload(input, setExtractionProgress);
    mediaRef.current = extracted.media;
    const parsed = await parseWhatsAppChat(
      extracted.chatText,
      extracted.media
    );
    setChat(parsed);
    setFlowPhase("analyzing");

    try {
      const result = await analyzeChat(parsed);
      setAnalysis(result);
      setFlowPhase("wizard");
    } catch (err) {
      if (err instanceof Error && err.message === "no_eligible_messages") {
        throw err;
      }
      // AI failed — still go to wizard with fallback
      setAnalysis(null);
      setFlowPhase("wizard");
    }
  }

  function handleSkipAi() {
    if (!chat) return;
    setAnalysis(null);
    setFlowPhase("wizard");
  }

  const handleWizardComplete = useCallback(
    (questions: WhoSaidItQuestion[], photos: Map<string, string>) => {
      if (!chat) return;
      setMemberPhotos(photos);
      wizardQuestionsRef.current = questions;
      setFlowPhase("mode-select");
    },
    [chat]
  );

  const handleModeSelect = useCallback(() => {
    if (!chat) return;
    const questions = wizardQuestionsRef.current;

    if (questions.length > 0) {
      game.initGame(chat, undefined, questions);
      setIsAiEnhanced(true);
    } else {
      game.initGame(chat);
      setIsAiEnhanced(false);
    }

    setFlowPhase("game");
  }, [chat, game]);

  const { phase } = game.state;
  const inGame = flowPhase === "game";

  return (
    <div
      className="flex min-h-screen flex-col"
      data-mode={
        inGame && !["setup", "lobby"].includes(phase)
          ? "who-said-it"
          : undefined
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          aria-label="חזרה לדף הבית"
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
            {flowPhase === "upload" && "העלאת צ׳אט"}
            {flowPhase === "analyzing" && "מנתח את הצ׳אט..."}
            {flowPhase === "wizard" && "הכנת המשחק"}
            {flowPhase === "mode-select" && "בחירת מצב משחק"}
            {inGame && phase === "lobby" &&
              `${game.state.players.length} שחקנים מחוברים`}
            {inGame &&
              !["setup", "lobby"].includes(phase) &&
              `סיבוב ${game.state.currentRound} מתוך ${game.state.settings.totalRounds}`}
          </p>
        </div>
        {isAiEnhanced && inGame && phase !== "final" && (
          <div className="rounded-full bg-[#E2A829]/20 px-2 py-0.5 text-[10px] font-bold text-[#E2A829]">
            AI
          </div>
        )}
      </header>

      <main
        className={`min-h-[calc(100vh-52px)] flex-1 ${flowPhase === "upload" ? "chat-wallpaper" : ""}`}
      >
        <AnimatePresence mode="wait">
          {flowPhase === "upload" && (
            <UploadStep
              key="upload"
              onUpload={handleUpload}
              extractionProgress={extractionProgress}
            />
          )}

          {flowPhase === "analyzing" && (
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
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsg}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-8 text-[14px] text-[#8B949E]"
                >
                  {LOADING_MESSAGES[loadingMsg]}
                </motion.p>
              </AnimatePresence>
              <button
                onClick={handleSkipAi}
                className="rounded-lg bg-[#21262D] px-4 py-2 text-[13px] text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-white"
              >
                דלגו ושחקו עם בחירה רנדומלית
              </button>
            </motion.div>
          )}

          {flowPhase === "wizard" && chat && (
            <GmSetup
              key="wizard"
              chat={chat}
              analysis={analysis}
              onComplete={handleWizardComplete}
            />
          )}

          {flowPhase === "mode-select" && (
            <ModeSelect key="mode-select" onSelect={handleModeSelect} />
          )}

          {inGame && phase === "lobby" && chat && (
            <LobbyStep
              key="lobby"
              game={game}
              memberNames={chat.members.map((m) => m.displayName)}
            />
          )}

          {inGame &&
            ["question", "answering", "reveal", "scores"].includes(phase) && (
              <GameRound
                key={`round-${game.state.currentRound}`}
                game={game}
                memberPhotos={memberPhotos}
              />
            )}

          {inGame && phase === "final" && (
            <FinalResults key="final" game={game} memberPhotos={memberPhotos} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
