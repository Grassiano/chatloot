"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import type { MemberProfile } from "@/lib/wizard/types";
import type { ParsedChat } from "@/lib/parser/types";

interface MemberCardsProps {
  profiles: MemberProfile[];
  chat: ParsedChat;
  onSetNickname: (displayName: string, nickname: string) => void;
  onSetPhoto: (displayName: string, url: string, blob: Blob | null) => void;
  onTagPhoto: (displayName: string, photoUrl: string) => void;
  onComplete: () => void;
}

const SWIPE_THRESHOLD = 80;

export function MemberCards({
  profiles,
  chat,
  onSetNickname,
  onSetPhoto,
  onTagPhoto,
  onComplete,
}: MemberCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Only show non-merged profiles
  const activeProfiles = profiles.filter((p) => !p.mergedInto);
  const current = activeProfiles[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < activeProfiles.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, activeProfiles.length, onComplete]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  // RTL: swipe left = forward (next), swipe right = backward (prev)
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD) {
        goNext();
      } else if (info.offset.x > SWIPE_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  const handleDeviceUpload = useCallback(
    (displayName: string, file: File) => {
      const url = URL.createObjectURL(file);
      onSetPhoto(displayName, url, file);
    },
    [onSetPhoto]
  );

  if (!current) return null;

  // RTL: forward (next) pushes cards LEFT, backward (prev) pushes RIGHT
  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? -300 : 300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
    exit: (d: number) => ({
      x: d > 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-52px)] flex-col px-3 py-4"
    >
      <div className="mx-auto w-full max-w-lg flex-1">
        {/* Header */}
        <div className="mb-4 text-center">
          <h2 className="text-[18px] font-bold text-[#1E1B3A]">
            הכירו את החברים
          </h2>
          <p className="mt-1 text-[13px] text-[#6B7194]">
            {currentIndex + 1} / {activeProfiles.length}
          </p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden" style={{ minHeight: 440 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.displayName}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              className="rounded-3xl bg-white/85 p-5 shadow-xl backdrop-blur-xl"
              style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
              <ProfileCard
                profile={current}
                onSetNickname={(nick) =>
                  onSetNickname(current.displayName, nick)
                }
                onDeviceUpload={(file) =>
                  handleDeviceUpload(current.displayName, file)
                }
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="rounded-full px-4 py-2 text-[14px] font-medium text-[#8B5CF6] transition-opacity disabled:opacity-30"
          >
            הקודם
          </button>

          {/* Progress dots */}
          <div className="flex gap-1">
            {activeProfiles.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                className="flex h-[44px] items-center justify-center px-0.5"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-5 bg-[#8B5CF6]"
                      : "w-2.5 bg-[#8B5CF6]/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={goNext}
            className="rounded-full bg-[#8B5CF6] px-4 py-2 text-[14px] font-bold text-white"
          >
            {currentIndex === activeProfiles.length - 1 ? "סיום" : "הבא"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Individual profile card content */
function ProfileCard({
  profile,
  onSetNickname,
  onDeviceUpload,
}: {
  profile: MemberProfile;
  onSetNickname: (nickname: string) => void;
  onDeviceUpload: (file: File) => void;
}) {
  const [editingNick, setEditingNick] = useState(false);
  const nickRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary = profile.aiSummary ?? profile.personalitySummary;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar — tap to upload from device */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onDeviceUpload(file);
        }}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-[#DFE5E7] ring-2 ring-[#8B5CF6]/30 transition-transform hover:scale-105"
      >
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-[32px]">
            {profile.personalityEmoji}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </button>

      {/* Name + personality title */}
      <div className="text-center">
        {editingNick ? (
          <input
            ref={nickRef}
            defaultValue={profile.nickname}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val) onSetNickname(val);
              setEditingNick(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            autoFocus
            className="w-full rounded-lg border border-[#8B5CF6] bg-transparent px-2 py-1 text-center text-[18px] font-bold text-[#1E1B3A] outline-none"
          />
        ) : (
          <h3 className="text-[18px] font-bold text-[#1E1B3A]">
            {profile.nickname}
          </h3>
        )}
        <p className="mt-0.5 text-[14px] text-[#6B7194]">
          {profile.personalityEmoji} {profile.personalityTitle}
        </p>
      </div>

      {/* Summary */}
      <div className="w-full rounded-xl bg-[#F0EEFF] px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={summary}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[14px] leading-relaxed text-[#1E1B3A]"
            dir="auto"
          >
            {summary}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Rich stats grid */}
      <div className="grid w-full grid-cols-2 gap-2">
        <StatPill icon="💬" label={`${profile.messageCount} הודעות`} />
        {profile.responseTimeAvg > 0 && (
          <StatPill icon="⏱️" label={`עונה תוך ${Math.round(profile.responseTimeAvg)} דק׳`} />
        )}
        {profile.burstCount > 0 && (
          <StatPill icon="🔥" label={`${profile.burstCount} ספאמים`} />
        )}
        {profile.longestGhostDays >= 3 && (
          <StatPill icon="👻" label={`נעלם ${profile.longestGhostDays} ימים`} />
        )}
        {profile.conversationStarts >= 2 && (
          <StatPill icon="⚡" label={`החיה ${profile.conversationStarts} שיחות`} />
        )}
        {profile.voiceNoteCount > 0 && (
          <StatPill icon="🎤" label={`${profile.voiceNoteCount} הודעות קול`} />
        )}
        {profile.mediaMessages > 0 && (
          <StatPill icon="📸" label={`${profile.mediaMessages} מדיה`} />
        )}
      </div>

      {/* Top words */}
      {profile.topWords.length > 0 && (
        <div className="flex w-full flex-wrap justify-center gap-1.5">
          {profile.topWords.map((w) => (
            <span
              key={w.word}
              className="rounded-full bg-[#F0EEFF] px-2.5 py-0.5 text-[12px] font-medium text-[#4C1D95]"
            >
              {w.word} ({w.count})
            </span>
          ))}
        </div>
      )}

      {/* Top emojis */}
      {profile.topEmojis.length > 0 && (
        <div className="flex items-center gap-3">
          {profile.topEmojis.slice(0, 3).map((e) => (
            <span key={e.emoji} className="text-center">
              <span className="text-[20px]">{e.emoji}</span>
              <span className="block text-[11px] text-[#6B7194]">{e.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Sample message */}
      {profile.sampleMessages[0] && (
        <div className="w-full rounded-lg rounded-tr-none bg-[#EDE9FE] px-4 py-2.5 shadow-sm">
          <p className="text-[13px] leading-relaxed text-[#1E1B3A]" dir="auto">
            &ldquo;{profile.sampleMessages[0]}&rdquo;
          </p>
        </div>
      )}

      {/* Voice note player */}
      {profile.sampleVoiceUrl && (
        <VoicePlayer url={profile.sampleVoiceUrl} />
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-[#F0EEFF] px-3 py-1.5 text-[12px] font-medium text-[#1E1B3A] transition-colors hover:bg-[#E0DBFF]"
        >
          תמונת פרופיל
        </button>
        <button
          onClick={() => {
            setEditingNick(true);
            setTimeout(() => nickRef.current?.focus(), 50);
          }}
          className="rounded-full bg-[#F0EEFF] px-3 py-1.5 text-[12px] font-medium text-[#1E1B3A] transition-colors hover:bg-[#E0DBFF]"
        >
          כינוי
        </button>
      </div>
    </div>
  );
}

/** Simple audio player for voice notes */
function VoicePlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  return (
    <div className="flex w-full items-center gap-3 rounded-full bg-[#F0EEFF] px-4 py-2">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-white"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <WaveformBars />
    </div>
  );
}

/** Small stat badge */
function StatPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[#F0EEFF] px-2.5 py-1.5 text-[12px] text-[#1E1B3A]">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

/** Pre-generated waveform bar heights to avoid Math.random() in render */
function WaveformBars() {
  const heights = useMemo(
    () => Array.from({ length: 20 }, () => 6 + Math.random() * 14),
    []
  );

  return (
    <div className="flex flex-1 items-center gap-0.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="h-3 w-1 rounded-full bg-[#8B5CF6]/40"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
