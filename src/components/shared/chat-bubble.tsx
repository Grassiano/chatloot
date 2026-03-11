"use client";

import { motion } from "framer-motion";

interface ChatBubbleProps {
  message: string;
  author: string | null;
  timestamp?: Date;
  isBlurred?: boolean;
  showAuthor?: boolean;
  className?: string;
}

export function ChatBubble({
  message,
  author,
  timestamp,
  isBlurred = false,
  showAuthor = true,
  className = "",
}: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative max-w-sm rounded-2xl rounded-tl-sm bg-card p-3 shadow-sm ${className}`}
    >
      {/* Chat bubble tail */}
      <div className="absolute -left-2 top-0 h-4 w-4 overflow-hidden">
        <div className="h-4 w-4 origin-bottom-right -rotate-45 bg-card" />
      </div>

      {showAuthor && author && (
        <p className="mb-1 text-xs font-bold text-loot-purple">{author}</p>
      )}

      <p
        className={`text-sm leading-relaxed ${
          isBlurred ? "select-none blur-md" : ""
        }`}
      >
        {message}
      </p>

      {timestamp && (
        <p className="mt-1 text-left text-[10px] text-muted-foreground">
          {timestamp.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </motion.div>
  );
}
