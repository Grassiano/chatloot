"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CodeInput } from "@/components/join/code-input";
import { roomApi } from "@/lib/room/api";
import { t } from "@/lib/i18n/he";
import { TextShimmer } from "@/components/ui/text-shimmer";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleJoin(roomCode?: string) {
    const finalCode = (roomCode ?? code).trim().toUpperCase();
    if (finalCode.length !== 6) return;

    setError("");
    setChecking(true);

    try {
      const room = await roomApi.getRoom(finalCode);
      if (!room) {
        setError(t("room.not_found"));
        setChecking(false);
        return;
      }
      router.push(`/join/${finalCode}`);
    } catch {
      setError(t("room.not_found"));
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F0FF] to-[#FAFAFE]">
      {/* Header */}
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label={t("common.back")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
          </svg>
        </Link>
        <h1 className="text-[15px] font-medium">{t("join.title")}</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          <div>
            <h2 className="text-2xl font-bold text-loot-ink">
              {t("join.enter_code")}
            </h2>
            <p className="mt-2 text-sm text-loot-ink-secondary">
              קבלו את הקוד מהמנחה או סרקו את ה-QR
            </p>
          </div>

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={handleJoin}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium text-loot-coral"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={() => handleJoin()}
            disabled={code.length !== 6 || checking}
            className="w-full rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] py-4 text-lg font-bold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-40"
          >
            {checking ? (
              <TextShimmer className="text-lg font-bold [--base-color:#ffffff] [--base-gradient-color:#FDE68A]" duration={1.5} rtl>
                {t("join.checking")}
              </TextShimmer>
            ) : t("join.button")}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
