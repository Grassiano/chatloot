"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { RoleCard } from "@/components/home/role-card";
import { ChatDemo } from "@/components/home/chat-demo";
import { t } from "@/lib/i18n/he";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { SparklesText } from "@/components/ui/sparkles-text";

export default function HomePage() {
  const router = useRouter();
  const [codeInput, setCodeInput] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  function handleQuickJoin() {
    const code = codeInput.trim().toUpperCase();
    if (code.length === 6) {
      router.push(`/join/${code}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F0FF] to-[#FAFAFE]">
      {/* Header */}
      <header className="flex items-center justify-center bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-5 text-white shadow-md">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black tracking-tight">
            <SparklesText text={t("home.title")} className="!text-3xl !font-black text-white" colors={{ first: "#FDE68A", second: "#FFFFFF" }} sparklesCount={6} />
          </h1>
          <VerticalCutReveal containerClassName="mt-1 justify-center text-sm font-medium opacity-80" staggerDuration={0.08}>
            {t("home.subtitle")}
          </VerticalCutReveal>
        </motion.div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          {/* Role selection cards */}
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              href="/room/create"
              emoji="🎯"
              title={t("home.gm.title")}
              description={t("home.gm.description")}
              color="#8B5CF6"
              delay={0.1}
            />
            <RoleCard
              href="/join"
              emoji="🎮"
              title={t("home.player.title")}
              description={t("home.player.description")}
              color="#8B5CF6"
              delay={0.2}
            />
          </div>

          {/* Quick join with room code */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-loot-ink/10" />
              <span className="text-xs font-medium text-loot-ink-secondary">
                {t("home.or")}
              </span>
              <div className="h-px flex-1 bg-loot-ink/10" />
            </div>

            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) =>
                  setCodeInput(e.target.value.toUpperCase().slice(0, 6))
                }
                onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                placeholder={t("home.quick_join")}
                className="flex-1 rounded-xl border border-white/50 bg-white/80 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-loot-ink placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-loot-ink-secondary focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                maxLength={6}
                dir="ltr"
              />
              <button
                onClick={handleQuickJoin}
                disabled={codeInput.length !== 6}
                className="rounded-xl bg-[#8B5CF6] px-5 min-h-[44px] text-sm font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                {t("home.quick_join.button")}
              </button>
            </div>
          </motion.div>

          {/* Solo mode link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <Link
              href="/play"
              className="group flex items-center gap-2 rounded-xl border border-loot-ink/5 bg-white/50 px-5 min-h-[44px] text-sm text-loot-ink-secondary transition-all hover:bg-white/80 hover:text-loot-ink"
            >
              <span>🎲</span>
              <span>{t("home.solo.title")}</span>
              <span className="text-xs opacity-60">
                — {t("home.solo.description")}
              </span>
            </Link>
          </motion.div>

          {/* How it works toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="min-h-[44px] flex items-center text-sm font-medium text-[#8B5CF6] underline decoration-dotted underline-offset-4 transition-colors hover:text-[#8B5CF6]"
            >
              {t("home.how_it_works")} {showDemo ? "▲" : "▼"}
            </button>

            {showDemo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full"
              >
                <ChatDemo />
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-loot-ink-secondary/50">
        ChatLoot
      </footer>
    </div>
  );
}
