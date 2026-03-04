"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGame } from "@/hooks/use-game";
import type { ParsedChat } from "@/lib/parser/types";
import { extractUpload } from "@/lib/parser/extract-files";
import { parseWhatsAppChat } from "@/lib/parser/parse-chat";
import { UploadStep } from "@/components/game/upload-step";
import { LobbyStep } from "@/components/game/lobby-step";
import { GameRound } from "@/components/game/game-round";
import { FinalResults } from "@/components/game/final-results";
import Link from "next/link";

export default function PlayPage() {
  const game = useGame();
  const [chat, setChat] = useState<ParsedChat | null>(null);

  async function handleUpload(input: File | FileList) {
    const extracted = await extractUpload(input);
    const parsed = await parseWhatsAppChat(extracted.chatText, extracted.media);
    setChat(parsed);
    game.initGame(parsed);
  }

  const { phase } = game.state;

  return (
    <div className="flex min-h-screen flex-col" data-mode={phase === "setup" || phase === "lobby" ? undefined : "who-said-it"}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">ChatLoot</h1>
          <p className="text-[11px] opacity-75">
            {phase === "setup" && "העלאת צ׳אט"}
            {phase === "lobby" && `${game.state.players.length} שחקנים מחוברים`}
            {!["setup", "lobby"].includes(phase) &&
              `סיבוב ${game.state.currentRound} מתוך ${game.state.settings.totalRounds}`}
          </p>
        </div>
        {phase !== "setup" && phase !== "lobby" && phase !== "final" && (
          <div className="text-[13px] font-bold tabular-nums">
            מי אמר?
          </div>
        )}
      </header>

      <main className={`flex-1 ${phase === "setup" ? "chat-wallpaper" : ""}`}>
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <UploadStep key="upload" onUpload={handleUpload} />
          )}

          {phase === "lobby" && chat && (
            <LobbyStep
              key="lobby"
              game={game}
              memberNames={chat.members.map((m) => m.displayName)}
            />
          )}

          {["question", "answering", "reveal", "scores"].includes(phase) && (
            <GameRound key={`round-${game.state.currentRound}`} game={game} />
          )}

          {phase === "final" && (
            <FinalResults key="final" game={game} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
