"use client";

import { useState, useEffect } from "react";
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
  "roast",
  "tagline",
] as const;

export function GroupReveal({ chat, onComplete }: GroupRevealProps) {
  const [visibleIndex, setVisibleIndex] = useState(-1);

  const roast = generateGroupRoast(chat);

  const dateStart = chat.stats.dateRange.start.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleIndex((prev) => {
        const next = prev + 1;
        if (next >= REVEAL_ITEMS.length) {
          clearInterval(timer);
          // Auto-advance after showing all items
          setTimeout(onComplete, 2000);
          return prev;
        }
        return next;
      });
    }, 700);

    // Start the first item immediately
    setVisibleIndex(0);

    return () => clearInterval(timer);
  }, [onComplete]);

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
              <h1 className="text-[28px] font-bold text-[#111B21]">
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
                className="text-[42px] font-black text-[#00A884] drop-shadow-[0_0_12px_rgba(0,168,132,0.4)]"
              />
              <span className="text-[18px] text-[#667781]">הודעות</span>
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
              <p className="text-[16px] text-[#667781]">
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
              <p className="text-[20px] font-semibold text-[#111B21]">
                {chat.stats.totalMembers} חברים
              </p>
            </motion.div>
          )}

          {/* Fun roast */}
          {visibleIndex >= 4 && (
            <motion.div
              key="roast"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl bg-[#D9FDD3]/90 px-5 py-3 shadow-md backdrop-blur-sm"
            >
              <p className="text-[15px] font-medium text-[#111B21]">
                {roast}
              </p>
            </motion.div>
          )}

          {/* Tagline */}
          {visibleIndex >= 5 && (
            <motion.div
              key="tagline"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[14px] italic text-[#667781]">
                קראתי הכל. אני יודע דברים.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip hint */}
      {visibleIndex < REVEAL_ITEMS.length - 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 text-[12px] text-[#667781]"
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
