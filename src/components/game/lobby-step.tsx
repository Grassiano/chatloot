"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { useGame } from "@/hooks/use-game";

interface LobbyStepProps {
  game: ReturnType<typeof useGame>;
  memberNames: string[];
}

export function LobbyStep({ game, memberNames }: LobbyStepProps) {
  const [nameInput, setNameInput] = useState("");
  const { players } = game.state;

  function addPlayer() {
    const name = nameInput.trim();
    if (!name) return;
    game.addPlayer(name);
    setNameInput("");
  }

  function addAllMembers() {
    for (const name of memberNames) {
      if (!players.find((p) => p.name === name)) {
        game.addPlayer(name);
      }
    }
  }

  const canStart = players.length >= 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="chat-wallpaper min-h-[calc(100vh-52px)] px-3 py-4"
    >
      <div className="mx-auto max-w-2xl space-y-3">
        {/* Add players prompt */}
        <div className="flex justify-center">
          <span className="rounded-lg bg-[#FFE9B2]/70 px-3 py-1.5 text-center text-[12px] text-[#54656F] shadow-sm">
            הוסיפו את השחקנים שמשתתפים הערב
          </span>
        </div>

        {/* Quick add all members */}
        <div className="flex justify-start">
          <button
            onClick={addAllMembers}
            className="rounded-lg rounded-tr-none bg-[#DCF8C6] p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-[12px] font-medium text-[#00A884]">ChatLoot</p>
            <p className="text-[13.5px] text-[#111B21]">
              מצאתי {memberNames.length} חברי קבוצה בצ׳אט.{" "}
              <span className="font-medium text-[#00A884]">
                הוסף את כולם?
              </span>
            </p>
          </button>
        </div>

        {/* Added players */}
        <AnimatePresence>
          {players.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[90%] rounded-lg rounded-tr-none bg-[#DCF8C6] shadow-sm sm:max-w-[80%]">
                <div className="px-3 pt-3">
                  <p className="text-[12px] font-medium text-[#00A884]">
                    שחקנים ({players.length})
                  </p>
                </div>
                <div className="mt-1 divide-y divide-[#c0e6a8]/50">
                  {players.map((player) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.avatar}
                        </div>
                        <span className="text-[14px] text-[#111B21]">
                          {player.name}
                        </span>
                      </div>
                      <button
                        onClick={() => game.removePlayer(player.id)}
                        className="min-h-[44px] min-w-[44px] text-[12px] text-[#667781] hover:text-[#FF6B6B]"
                      >
                        הסר
                      </button>
                    </motion.div>
                  ))}
                </div>
                <div className="px-3 pb-2 pt-1">
                  <p className="text-left text-[10.5px] text-[#667781]">
                    עכשיו
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual add input */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                placeholder="הוסף שחקן..."
                className="flex-1 bg-transparent text-[14px] text-[#111B21] placeholder:text-[#667781] focus:outline-none"
              />
              <button
                onClick={addPlayer}
                disabled={!nameInput.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white transition-opacity disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Start game button */}
        {canStart && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-4"
          >
            <button
              onClick={game.startGame}
              className="rounded-2xl bg-[#00A884] px-8 py-4 text-[17px] font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
            >
              יאללה, מתחילים! 🎮
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
