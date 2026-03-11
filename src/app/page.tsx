"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/*
 * The landing page IS a fake WhatsApp group chat.
 * Messages appear one by one like a real conversation.
 * The "group" is explaining ChatLoot to each other.
 * The CTA is a message from "you" at the bottom.
 */

interface ChatMessage {
  id: number;
  author: string;
  color: string;
  text: string;
  time: string;
  type?: "text" | "system" | "image-placeholder";
  replyTo?: string;
}

const GROUP_NAME = "החברים מהצבא 🫡";
const MEMBER_COUNT = 8;

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
    color: "#E2A829",
    text: "חבר׳ה מישהו זוכר את הסיפור עם דני בטיול לאילת?? 😂😂",
    time: "21:03",
  },
  {
    id: 2,
    author: "גלי",
    color: "#00A884",
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
    color: "#E2A829",
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
    color: "#00A884",
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
    color: "#E2A829",
    text: "😂😂😂😂😂",
    time: "21:07",
  },
  {
    id: 11,
    author: "גלי",
    color: "#00A884",
    text: "יאללה מי מייצא את הצ׳אט? יוסי תעשה את זה",
    time: "21:08",
  },
  {
    id: 12,
    author: "יוסי",
    color: "#E2A829",
    text: "למה תמיד אני 😤",
    time: "21:08",
  },
  {
    id: 13,
    author: "יוסי",
    color: "#E2A829",
    text: "טוב יאללה",
    time: "21:08",
  },
];

export default function LandingPage() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (visibleCount < CHAT_SCRIPT.length) {
      const delay = visibleCount === 0 ? 600 : 400 + Math.random() * 500;
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowCTA(true), 800);
      return () => clearTimeout(timer);
    }
  }, [visibleCount]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* WhatsApp-style header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-gradient-to-b from-[#075E54] to-[#064E46] px-4 py-2.5 text-white shadow-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
          ח
        </div>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium leading-tight">
            {GROUP_NAME}
          </h1>
          <p className="text-[11px] leading-tight opacity-75">
            {MEMBER_COUNT} משתתפים
          </p>
        </div>
      </header>

      {/* Chat area */}
      <main className="chat-wallpaper flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-2xl space-y-1">
          {/* Date chip */}
          <div className="flex justify-center py-2">
            <span className="rounded-full bg-[#FFE9B2]/90 px-3 py-1 text-[11px] text-[#54656F] shadow-sm backdrop-blur-sm">
              היום
            </span>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {CHAT_SCRIPT.slice(0, visibleCount).map((msg) =>
              msg.type === "system" ? (
                <SystemMessage key={msg.id} text={msg.text} />
              ) : (
                <Bubble key={msg.id} msg={msg} />
              )
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          {visibleCount < CHAT_SCRIPT.length && visibleCount > 0 && (
            <TypingIndicator
              author={CHAT_SCRIPT[visibleCount]?.author ?? ""}
            />
          )}
        </div>
      </main>

      {/* CTA — appears as the "your message" input area */}
      <AnimatePresence>
        {showCTA ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="sticky bottom-0 border-t border-[#E9EDEF] bg-[#F0F2F5] px-3 py-2.5"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <Link
                href="/play"
                className="flex-1 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-loot-ink shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
              >
                <span className="text-loot-ink-secondary">
                  גם לכם יש קבוצה כזאת?
                </span>{" "}
                <span className="font-bold text-loot-teal-deep">
                  בואו נשחק →
                </span>
              </Link>
              <Link
                href="/play"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-sm glow-teal-strong transition-transform hover:scale-105 active:scale-95"
                aria-label="התחל"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="currentColor"
                  className=""
                >
                  <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.239 1.816L1.112 13.845z" />
                </svg>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="h-[60px] border-t border-[#E9EDEF] bg-[#F0F2F5]" />
        )}
      </AnimatePresence>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  // Determine if this is a "self" message (מור introduces the app)
  const isSelf = msg.author === "מור";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex ${isSelf ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`relative max-w-[85%] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-md sm:max-w-[70%] ${
          isSelf
            ? "rounded-tr-none bg-[#D9FDD3]"
            : "rounded-tl-none bg-white"
        }`}
      >
        {/* Author name */}
        <p className="text-[12px] font-medium" style={{ color: msg.color }}>
          {msg.author}
        </p>

        {/* Reply preview */}
        {msg.replyTo && (
          <div className="mb-1 rounded border-r-[3px] border-[#00A884] bg-[#F0F2F5]/60 px-2 py-1 text-[12px] text-loot-ink-secondary">
            {msg.replyTo}
          </div>
        )}

        {/* Message text */}
        <p className="text-[14.2px] leading-[19px] text-loot-ink">
          {msg.text}
        </p>

        {/* Time */}
        <p className="mt-0.5 text-left text-[10.5px] leading-none text-loot-ink-secondary">
          {msg.time}
        </p>
      </div>
    </motion.div>
  );
}

function SystemMessage({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center py-1"
    >
      <span className="rounded-lg bg-[#FFE9B2]/70 px-3 py-1 text-center text-[11.5px] text-[#54656F] shadow-sm">
        {text}
      </span>
    </motion.div>
  );
}

function TypingIndicator({ author }: { author: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex justify-end"
    >
      <div className="rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
        <p className="mb-0.5 text-[11px] font-medium text-loot-ink-secondary">
          {author}
        </p>
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
              className="inline-block h-2 w-2 rounded-full bg-[#8696A0]"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
