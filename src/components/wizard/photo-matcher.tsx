"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaFile } from "@/lib/parser/types";
import type { MemberProfile } from "@/lib/wizard/types";

interface PhotoMatcherProps {
  /** All media from the chat export */
  media: Map<string, MediaFile>;
  /** Member profiles (non-merged only) */
  profiles: MemberProfile[];
  /** Called when GM assigns a photo to a member */
  onAssign: (displayName: string, photoUrl: string) => void;
  /** Called when matching is done (finish button or ran out of photos) */
  onDone: () => void;
}

const MAX_PHOTOS = 80;
const SAMPLE_INTERVAL_THRESHOLD = 50;

export function PhotoMatcher({
  media,
  profiles,
  onAssign,
  onDone,
}: PhotoMatcherProps) {
  const images = useMemo(() => {
    const allImages = Array.from(media.values()).filter(
      (f) => f.type === "image"
    );

    // If too many, sample every Nth
    if (allImages.length > SAMPLE_INTERVAL_THRESHOLD) {
      const step = Math.ceil(allImages.length / MAX_PHOTOS);
      const sampled: MediaFile[] = [];
      for (let i = 0; i < allImages.length && sampled.length < MAX_PHOTOS; i += step) {
        sampled.push(allImages[i]);
      }
      return sampled;
    }
    return allImages;
  }, [media]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [assigned, setAssigned] = useState<Map<string, string>>(new Map());

  const current = images[currentIdx];
  const isLast = currentIdx >= images.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      onDone();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }, [isLast, onDone]);

  const handleAssign = useCallback(
    (displayName: string) => {
      if (!current) return;
      onAssign(displayName, current.url);
      setAssigned((prev) => {
        const next = new Map(prev);
        next.set(current.url, displayName);
        return next;
      });
      // Auto-advance after a short delay
      setTimeout(advance, 300);
    },
    [current, onAssign, advance]
  );

  if (images.length === 0) {
    // No images — skip matching entirely
    onDone();
    return null;
  }

  if (!current) {
    onDone();
    return null;
  }

  const assignedTo = assigned.get(current.url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0D1117]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onDone}
          className="rounded-lg bg-[#21262D] px-3 py-1.5 text-[13px] font-medium text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-white"
        >
          סיום
        </button>
        <div className="text-center">
          <h2 className="text-[16px] font-bold text-white">מי זה?</h2>
          <p className="text-[12px] text-[#8B949E]">
            {currentIdx + 1} / {images.length}
          </p>
        </div>
        <button
          onClick={advance}
          className="rounded-lg bg-[#21262D] px-3 py-1.5 text-[13px] font-medium text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-white"
        >
          דלג
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[#21262D]">
        <motion.div
          className="h-full bg-[#00A884]"
          initial={false}
          animate={{ width: `${((currentIdx + 1) / images.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Photo display */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.url}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[50vh] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
          >
            <img
              src={current.url}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
            {assignedTo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <div className="rounded-full bg-[#00A884] px-4 py-2 text-[15px] font-bold text-white">
                  {assignedTo}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Member chips — horizontal scroll */}
      <div className="border-t border-[#21262D] px-3 pb-6 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2" dir="rtl">
          {profiles.map((profile) => (
            <motion.button
              key={profile.displayName}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAssign(profile.displayName)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-[#161B22] px-4 py-2.5 transition-colors hover:bg-[#21262D] active:bg-[#00A884]/20"
            >
              <span className="text-[16px]">{profile.personalityEmoji}</span>
              <span className="whitespace-nowrap text-[14px] font-medium text-white">
                {profile.nickname}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
