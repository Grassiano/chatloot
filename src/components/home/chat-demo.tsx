"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * The animated fake WhatsApp group chat demo.
 * Extracted from the original landing page for reuse.
 */

interface ChatMessage {
  id: number;
  author: string;
  color: string;
  text: string;
  time: string;
  type?: "text" | "system";
  replyTo?: string;
}

const CHAT_SCRIPT: ChatMessage[] = [
  {
    id: 0,
    author: "",
    color: "",
    text: "יוסי הוסיף את דני. גלי הוסיפה את מור.",
    time: "09:12",
    type: "system",
  },
  {
    id: 1,
    author: "יוסי",
    color: "#FBBF24",
    text: "חבר׳ה מישהו זוכר את הסיפור עם דני בטיול לאילת?? 😂😂",
    time: "21:03",
  },
  {
    id: 2,
    author: "גלי",
    color: "#8B5CF6",
    text: "אההההה לא לא לא אל תעלה את זה 🙈",
    time: "21:03",
  },
  {
    id: 3,
    author: "דני",
    color: "#FF6B6B",
    text: "אחי אני מוחק את עצמי מהקבוצה",
    time: "21:04",
  },
  {
    id: 4,
    author: "מור",
    color: "#7C5CFC",
    text: "חכו חכו חכו. מצאתי אפליקציה שלוקחת את כל הצ׳אט ועושה מזה משחק",
    time: "21:04",
  },
  {
    id: 5,
    author: "יוסי",
    color: "#FBBF24",
    text: "??מה",
    time: "21:05",
  },
  {
    id: 6,
    author: "מור",
    color: "#7C5CFC",
    text: "ChatLoot. מישהו מייצא את הצ׳אט, מעלה, והאפליקציה הופכת את כל ההודעות והתמונות שלנו למשחק מטורף",
    time: "21:05",
    replyTo: "??מה",
  },
  {
    id: 7,
    author: "גלי",
    color: "#8B5CF6",
    text: "רגע זה גאוני. כאילו משחק ״מי אמר?״ עם ההודעות שלנו??",
    time: "21:06",
  },
  {
    id: 8,
    author: "מור",
    color: "#7C5CFC",
    text: "יש שם כמה משחקים. ״מי אמר״, ״כיסא חם״ שעושים לכל אחד רואסט, ״פרסי הקבוצה״ — כאילו טקס פרסים לפי הצ׳אט 🏆",
    time: "21:06",
  },
  {
    id: 9,
    author: "דני",
    color: "#FF6B6B",
    text: "אוקיי אני בפנים. אבל אם יש שם את הסיפור מאילת אני תובע",
    time: "21:07",
  },
  {
    id: 10,
    author: "יוסי",
    color: "#FBBF24",
    text: "😂😂😂😂😂",
    time: "21:07",
  },
  {
    id: 11,
    author: "גלי",
    color: "#8B5CF6",
    text: "יאללה מי מייצא את הצ׳אט? יוסי תעשה את זה",
    time: "21:08",
  },
  {
    id: 12,
    author: "יוסי",
    color: "#FBBF24",
    text: "למה תמיד אני 😤",
    time: "21:08",
  },
  {
    id: 13,
    author: "יוסי",
    color: "#FBBF24",
    text: "טוב יאללה",
    time: "21:08",
  },
];

const GROUP_NAME = "החברים מהצבא 🫡";
const MEMBER_COUNT = 8;

export function ChatDemo() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < CHAT_SCRIPT.length) {
      const delay = visibleCount === 0 ? 600 : 400 + Math.random() * 500;
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleCount]);

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-xl">
      {/* WhatsApp-style header */}
      <header className="flex items-center gap-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-4 py-2.5 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
          ח
        </div>
        <div className="flex-1">
          <h3 className="text-[13px] font-medium leading-tight">
            {GROUP_NAME}
          </h3>
          <p className="text-[11px] leading-tight opacity-75">
            {MEMBER_COUNT} משתתפים
          </p>
        </div>
      </header>

      {/* Chat area */}
      <div className="chat-wallpaper max-h-[360px] overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          <div className="flex justify-center py-1">
            <span className="rounded-full bg-[#EDE9FE]/90 px-3 py-0.5 text-[11px] text-[#6B7194] shadow-sm">
              היום
            </span>
          </div>

          <AnimatePresence>
            {CHAT_SCRIPT.slice(0, visibleCount).map((msg) =>
              msg.type === "system" ? (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center py-1"
                >
                  <span className="rounded-lg bg-[#EDE9FE]/70 px-3 py-1 text-center text-[11px] text-[#6B7194] shadow-sm">
                    {msg.text}
                  </span>
                </motion.div>
              ) : (
                <DemoBubble key={msg.id} msg={msg} />
              )
            )}
          </AnimatePresence>

          {visibleCount < CHAT_SCRIPT.length && visibleCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-end"
            >
              <div className="rounded-lg rounded-tl-none bg-white px-3 py-1.5 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        delay: i * 0.2,
                      }}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-[#8696A0]"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoBubble({ msg }: { msg: ChatMessage }) {
  const isSelf = msg.author === "מור";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex ${isSelf ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`relative max-w-[85%] rounded-lg px-2 pb-1 pt-1.5 shadow-sm ${
          isSelf
            ? "rounded-tr-none bg-[#EDE9FE]"
            : "rounded-tl-none bg-white"
        }`}
      >
        <p className="text-[11px] font-medium" style={{ color: msg.color }}>
          {msg.author}
        </p>
        {msg.replyTo && (
          <div className="mb-0.5 rounded border-r-[3px] border-[#8B5CF6] bg-[#F0EEFF]/60 px-1.5 py-0.5 text-[11px] text-loot-ink-secondary">
            {msg.replyTo}
          </div>
        )}
        <p className="text-[12px] leading-[16px] text-loot-ink">{msg.text}</p>
        <p className="mt-0.5 text-left text-[11px] leading-none text-loot-ink-secondary">
          {msg.time}
        </p>
      </div>
    </motion.div>
  );
}
