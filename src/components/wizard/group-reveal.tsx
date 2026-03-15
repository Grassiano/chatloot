"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParsedChat } from "@/lib/parser/types";
import { generateGroupRoast } from "@/lib/wizard/personality";

interface GroupRevealProps {
  chat: ParsedChat;
  onComplete: () => void;
}

const REVEAL_ITEMS = [
  "groupName",
  "messageCount",
  "dateRange",
  "memberCount",
  "statsRow",
  "totalDays",
  "roast",
  "tagline",
] as const;

const HEBREW_DAYS: Record<string, string> = {
  Sunday: "ראשון",
  Monday: "שני",
  Tuesday: "שלישי",
  Wednesday: "רביעי",
  Thursday: "חמישי",
  Friday: "שישי",
  Saturday: "שבת",
};

export function GroupReveal({ chat, onComplete }: GroupRevealProps) {
  const [visibleIndex, setVisibleIndex] = useState(-1);

  const roast = useMemo(() => generateGroupRoast(chat), [chat]);

  const startDate = chat.stats.dateRange.start instanceof Date
    ? chat.stats.dateRange.start
    : new Date(chat.stats.dateRange.start);
  const dateStart = startDate.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  const [revealDone, setRevealDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleIndex((prev) => {
        const next = prev + 1;
        if (next >= REVEAL_ITEMS.length) {
          clearInterval(timer);
          setRevealDone(true);
          return prev;
        }
        return next;
      });
    }, 600);

    // Start the first item immediately
    setVisibleIndex(0);

    return () => clearInterval(timer);
  }, []);

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-4"
      onClick={onComplete}
    >
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <AnimatePresence>
          {/* Group name */}
          {visibleIndex >= 0 && chat.groupName && (
            <motion.div
              key="groupName"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-[28px] font-bold text-[#1E1B3A]">
                &ldquo;{chat.groupName}&rdquo;
              </h1>
            </motion.div>
          )}

          {/* Message count */}
          {visibleIndex >= 1 && (
            <motion.div
              key="messageCount"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-2"
            >
              <AnimatedCounter
                value={chat.stats.totalMessages}
                className="text-[42px] font-black text-[#8B5CF6] drop-shadow-[0_0_12px_rgba(139, 92, 246,0.4)]"
              />
              <span className="text-[18px] text-[#6B7194]">הודעות</span>
            </motion.div>
          )}

          {/* Date range */}
          {visibleIndex >= 2 && (
            <motion.div
              key="dateRange"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[16px] text-[#6B7194]">
                מאז {dateStart}
              </p>
            </motion.div>
          )}

          {/* Member count */}
          {visibleIndex >= 3 && (
            <motion.div
              key="memberCount"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[20px] font-semibold text-[#1E1B3A]">
                {chat.stats.totalMembers} חברים
              </p>
            </motion.div>
          )}

          {/* Stats row — pills */}
          {visibleIndex >= 4 && (
            <motion.div
              key="statsRow"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap justify-center gap-2"
            >
              <span className="rounded-full bg-[#F0EEFF] px-3 py-1 text-[13px] font-medium text-[#4C1D95]">
                {chat.stats.messagesPerDay} הודעות ביום
              </span>
              <span className="rounded-full bg-[#F0EEFF] px-3 py-1 text-[13px] font-medium text-[#4C1D95]">
                שיא: {String(chat.stats.peakHour).padStart(2, "0")}:00
              </span>
              <span className="rounded-full bg-[#F0EEFF] px-3 py-1 text-[13px] font-medium text-[#4C1D95]">
                יום {HEBREW_DAYS[chat.stats.busiestDay] ?? chat.stats.busiestDay}
              </span>
            </motion.div>
          )}

          {/* Total days */}
          {visibleIndex >= 5 && (
            <motion.div
              key="totalDays"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[16px] text-[#6B7194]">
                {chat.stats.totalDays.toLocaleString()} ימים של שיחות
              </p>
            </motion.div>
          )}

          {/* Fun roast */}
          {visibleIndex >= 6 && (
            <motion.div
              key="roast"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl bg-[#EDE9FE]/90 px-5 py-3 shadow-md backdrop-blur-sm"
            >
              <p className="text-[15px] font-medium text-[#1E1B3A]">
                {roast}
              </p>
            </motion.div>
          )}

          {/* Tagline */}
          {visibleIndex >= 7 && (
            <motion.div
              key="tagline"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[14px] italic text-[#6B7194]">
                קראתי הכל. אני יודע דברים.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Continue button after reveal, or skip hint during */}
      {revealDone ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onComplete}
          className="absolute bottom-8 rounded-full bg-[#8B5CF6] px-8 py-3 text-[15px] font-bold text-white shadow-lg transition-transform active:scale-95"
        >
          יאללה, קדימה ←
        </motion.button>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 text-[12px] text-[#6B7194]"
        >
          לחצו לדלג
        </motion.p>
      )}
    </motion.div>
  );
}

/** Animated number counter */
function AnimatedCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={className}>{display.toLocaleString()}</span>
  );
}
