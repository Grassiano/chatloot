"use client";

import { motion } from "framer-motion";
import { t } from "@/lib/i18n/he";
import type { ParsedChat } from "@/lib/parser/types";
import Link from "next/link";

interface ParsedResultsProps {
  chat: ParsedChat;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("he-IL");
}

const AVATAR_COLORS = [
  "#E2A829",
  "#00A884",
  "#FF6B6B",
  "#7C5CFC",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#8B5CF6",
];

export function ParsedResults({ chat }: ParsedResultsProps) {
  const { members, stats, messages, groupName } = chat;

  // Find night owl and emoji king
  let nightOwl = { name: "", count: 0 };
  let emojiKing = { name: "", count: 0 };
  for (const [name, ms] of stats.members) {
    if (ms.nightMessages > nightOwl.count)
      nightOwl = { name, count: ms.nightMessages };
    if (ms.emojiCount > emojiKing.count)
      emojiKing = { name, count: ms.emojiCount };
  }

  // Get random funny messages for preview
  const sampleMessages = messages
    .filter(
      (m) =>
        m.author !== null &&
        m.message !== "<Media omitted>" &&
        !m.message.includes("<attached:") &&
        m.message.length > 8 &&
        m.message.length < 150
    )
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  return (
    <div className="space-y-2">
      {/* Success message — looks like an incoming message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex justify-center py-2"
      >
        <div className="rounded-lg bg-[#FFE9B2]/80 px-4 py-2 text-center shadow-sm">
          <p className="text-[13px] font-medium text-[#54656F]">
            {groupName ? `"${groupName}"` : "הצ׳אט"} נטען בהצלחה
          </p>
        </div>
      </motion.div>

      {/* Stats as a "message" from ChatLoot */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-start"
      >
        <div className="max-w-[90%] rounded-lg rounded-tr-none bg-[#DCF8C6] p-3 shadow-sm sm:max-w-[80%]">
          <p className="mb-2 text-[12px] font-medium text-[#00A884]">
            ChatLoot
          </p>

          {/* Stats grid — compact, not card-based */}
          <div className="mb-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px] text-loot-ink">
            <div className="flex justify-between">
              <span className="text-loot-ink-secondary">הודעות</span>
              <span className="font-semibold tabular-nums">
                {formatNumber(stats.totalMessages)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-loot-ink-secondary">חברים</span>
              <span className="font-semibold">{stats.totalMembers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-loot-ink-secondary">מדיה</span>
              <span className="font-semibold tabular-nums">
                {formatNumber(stats.mediaCount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-loot-ink-secondary">תקופה</span>
              <span className="text-[12px] font-semibold">
                {formatDate(stats.dateRange.start).split(" ").slice(0, 2).join(" ")} –{" "}
                {formatDate(stats.dateRange.end).split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          </div>

          <div className="my-2 border-t border-[#c0e6a8]" />

          {/* Quick awards — one-liners */}
          <div className="space-y-1 text-[13px]">
            <p>
              <span className="text-loot-ink-secondary">הכי פעיל:</span>{" "}
              <span className="font-semibold">{members[0]?.displayName}</span>
              <span className="text-loot-ink-secondary">
                {" "}
                ({formatNumber(members[0]?.messageCount)} הודעות)
              </span>
            </p>
            {nightOwl.name && (
              <p>
                <span className="text-loot-ink-secondary">ינשוף הלילה:</span>{" "}
                <span className="font-semibold">{nightOwl.name}</span>
                <span className="text-loot-ink-secondary">
                  {" "}
                  ({nightOwl.count} הודעות אחרי חצות)
                </span>
              </p>
            )}
            {emojiKing.name && (
              <p>
                <span className="text-loot-ink-secondary">
                  מלך האימוג׳י:
                </span>{" "}
                <span className="font-semibold">{emojiKing.name}</span>
                <span className="text-loot-ink-secondary">
                  {" "}
                  ({formatNumber(emojiKing.count)} אימוג׳ים)
                </span>
              </p>
            )}
          </div>

          <p className="mt-1.5 text-left text-[10.5px] text-loot-ink-secondary">
            עכשיו
          </p>
        </div>
      </motion.div>

      {/* Members as contact list — feels like WhatsApp group info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-start"
      >
        <div className="max-w-[90%] rounded-lg rounded-tr-none bg-[#DCF8C6] shadow-sm sm:max-w-[80%]">
          <div className="px-3 pt-3">
            <p className="text-[12px] font-medium text-[#00A884]">ChatLoot</p>
            <p className="mt-0.5 text-[13.5px] text-loot-ink">
              זיהיתי {stats.totalMembers} חברי קבוצה:
            </p>
          </div>

          <div className="mt-2 divide-y divide-[#c0e6a8]/50">
            {members.slice(0, 10).map((member, i) => {
              const ms = stats.members.get(member.displayName);
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <motion.div
                  key={member.displayName}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {member.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-loot-ink">
                      {member.displayName}
                    </p>
                    <p className="text-[11.5px] text-loot-ink-secondary">
                      {formatNumber(member.messageCount)} הודעות
                      {ms?.topEmojis[0] && ` · ${ms.topEmojis[0].emoji}`}
                    </p>
                  </div>
                  <span className="text-[11px] tabular-nums text-loot-ink-secondary">
                    {Math.round(
                      (member.messageCount / stats.totalMessages) * 100
                    )}
                    %
                  </span>
                </motion.div>
              );
            })}
            {members.length > 10 && (
              <div className="px-3 py-2 text-center text-[12px] text-loot-ink-secondary">
                +{members.length - 10} חברים נוספים
              </div>
            )}
          </div>

          <div className="px-3 pb-2 pt-1">
            <p className="text-left text-[10.5px] text-loot-ink-secondary">
              עכשיו
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sample messages preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center py-1"
      >
        <span className="rounded-lg bg-[#FFE9B2]/70 px-3 py-1 text-[11.5px] text-[#54656F] shadow-sm">
          הנה טעימה מהצ׳אט שלכם
        </span>
      </motion.div>

      {sampleMessages.map((msg, i) => {
        const memberIdx = members.findIndex(
          (m) => m.displayName === msg.author
        );
        const color = AVATAR_COLORS[memberIdx % AVATAR_COLORS.length];
        const isEven = i % 2 === 0;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.15 }}
            className={`flex ${isEven ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-2.5 shadow-sm ${
                isEven
                  ? "rounded-tl-none bg-white"
                  : "rounded-tr-none bg-[#DCF8C6]"
              }`}
            >
              <p className="text-[12px] font-medium" style={{ color }}>
                {msg.author}
              </p>
              <p className="text-[14px] leading-[19px] text-loot-ink">
                {msg.message}
              </p>
              <p className="mt-0.5 text-left text-[10.5px] text-loot-ink-secondary">
                {msg.date.toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* CTA — the "next step" */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, type: "spring", stiffness: 150 }}
        className="flex justify-center pb-6 pt-4"
      >
        <Link
          href="/play"
          className="group flex items-center gap-3 rounded-2xl bg-[#00A884] px-6 py-4 text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
        >
          <span className="text-[16px] font-bold">
            {t("setup.members.continue")}
          </span>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}
