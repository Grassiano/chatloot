"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HighlightCard, HighlightCategory } from "@/lib/wizard/types";
import { hapticTap } from "@/lib/haptics";

interface HighlightsReviewProps {
  highlights: HighlightCard[];
  onToggleApproval: (index: number) => void;
  onEditGmNote: (index: number, note: string) => void;
  onSetCategory: (index: number, category: HighlightCategory | null) => void;
  onApproveAll: () => void;
  onComplete: () => void;
}

const CATEGORY_OPTIONS: Array<{
  value: HighlightCategory;
  emoji: string;
  label: string;
}> = [
  { value: "funny", emoji: "😂", label: "מצחיק" },
  { value: "iconic", emoji: "🔥", label: "איקוני" },
  { value: "cringe", emoji: "😬", label: "קרינג׳" },
  { value: "emotional", emoji: "🥺", label: "רגשי" },
];

export function HighlightsReview({
  highlights,
  onToggleApproval,
  onEditGmNote,
  onSetCategory,
  onApproveAll,
  onComplete,
}: HighlightsReviewProps) {
  const approvedCount = highlights.filter((h) => h.approved).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-52px)] flex-col px-3 py-4"
    >
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#1E1B3A]">
              מצאתי {highlights.length} רגעים שווים
            </h2>
            <p className="text-[13px] text-[#6B7194]">
              {approvedCount} מאושרים
            </p>
          </div>
          <button
            onClick={onApproveAll}
            className="rounded-full bg-[#F0EEFF] px-3 py-1.5 text-[12px] font-medium text-[#1E1B3A] transition-colors hover:bg-[#E0DBFF]"
          >
            אשרו הכל
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3 pb-24">
          <AnimatePresence>
            {highlights.map((highlight, index) => (
              <HighlightCardComponent
                key={index}
                highlight={highlight}
                index={index}
                onToggleApproval={onToggleApproval}
                onEditGmNote={onEditGmNote}
                onSetCategory={onSetCategory}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5]/80 to-transparent px-4 pb-6 pt-10">
        <div className="mx-auto max-w-lg">
          <button
            onClick={onComplete}
            disabled={approvedCount === 0}
            className="w-full rounded-full bg-[#8B5CF6] py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#8B5CF6]/90 disabled:opacity-40"
          >
            בואו נשחק! ({approvedCount} שאלות)
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HighlightCardComponent({
  highlight,
  index,
  onToggleApproval,
  onEditGmNote,
  onSetCategory,
}: {
  highlight: HighlightCard;
  index: number;
  onToggleApproval: (index: number) => void;
  onEditGmNote: (index: number, note: string) => void;
  onSetCategory: (index: number, category: HighlightCategory | null) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: highlight.approved ? 1 : 0.5, y: 0 }}
      className={`rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur-lg transition-opacity ${
        !highlight.approved ? "opacity-50" : ""
      }`}
      style={{ WebkitBackdropFilter: "blur(16px)" }}
    >
      {/* Score + reason */}
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-gradient-to-r from-[#EDE9FE] to-[#C4B5FD] px-2 py-0.5 text-[12px] font-bold text-[#6B7194]">
          {highlight.aiScore}
        </span>
        <span className="text-[12px] text-[#6B7194]" dir="auto">
          {highlight.aiReason}
        </span>
      </div>

      {/* Message */}
      <div className="mb-2 rounded-lg rounded-tl-none bg-[#EDE9FE] px-3 py-2 shadow-sm">
        <p className="text-[14px] leading-relaxed text-[#1E1B3A]" dir="auto">
          &ldquo;{highlight.question.messageText}&rdquo;
        </p>
        <p className="mt-1 text-left text-[11px] text-[#6B7194]">
          — {highlight.question.correctAuthor}
        </p>
      </div>

      {/* GM Note */}
      {editingNote ? (
        <input
          defaultValue={highlight.gmNoteEdited}
          onBlur={(e) => {
            onEditGmNote(index, e.target.value);
            setEditingNote(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          autoFocus
          placeholder="הערת מנחה..."
          dir="auto"
          className="mb-2 w-full rounded-lg border border-[#8B5CF6] bg-transparent px-3 py-1.5 text-[13px] text-[#1E1B3A] outline-none"
        />
      ) : highlight.gmNoteEdited ? (
        <button
          onClick={() => setEditingNote(true)}
          className="mb-2 w-full text-right"
        >
          <p className="text-[13px] italic text-[#6B7194]" dir="auto">
            {highlight.gmNoteEdited}
          </p>
        </button>
      ) : (
        <button
          onClick={() => setEditingNote(true)}
          className="mb-2 text-[12px] text-[#8B5CF6]"
        >
          + הוסיפו הערת מנחה
        </button>
      )}

      {/* Category chips + approve/reject */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              onClick={() =>
                onSetCategory(
                  index,
                  highlight.category === cat.value ? null : cat.value
                )
              }
              className={`min-h-[44px] min-w-[44px] rounded-full px-3 py-2.5 text-[13px] transition-colors ${
                highlight.category === cat.value
                  ? "bg-[#8B5CF6] text-white ring-2 ring-[#8B5CF6]/30"
                  : "bg-[#F0EEFF] text-[#6B7194] hover:bg-[#E0DBFF]"
              }`}
            >
              {cat.emoji}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            hapticTap();
            onToggleApproval(index);
          }}
          className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
            highlight.approved
              ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
              : "bg-[#F0EEFF] text-[#6B7194]"
          }`}
        >
          {highlight.approved ? "✓ מאושר" : "✕ הוסר"}
        </button>
      </div>
    </motion.div>
  );
}
