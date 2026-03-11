"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemberProfile } from "@/lib/wizard/types";
import type { SmartPhoto } from "@/lib/wizard/photo-utils";
import type { ScannedPhoto, ScanProgress } from "@/lib/wizard/face-scanner";
import { scanPhotos, findMatchingPhotos } from "@/lib/wizard/face-scanner";
import { hapticTap, hapticSuccess } from "@/lib/haptics";

interface PhotoMatcherProps {
  smartPhotos: SmartPhoto[];
  profiles: MemberProfile[];
  onAssign: (displayName: string, photoUrl: string) => void;
  onDone: () => void;
}

export function PhotoMatcher({
  smartPhotos,
  profiles,
  onAssign,
  onDone,
}: PhotoMatcherProps) {
  const [scanStatus, setScanStatus] = useState<"scanning" | "done" | "failed">(
    "scanning"
  );
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    current: 0,
    total: smartPhotos.length,
    stage: "loading_model",
  });
  const [scannedPhotos, setScannedPhotos] = useState<ScannedPhoto[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [assigned, setAssigned] = useState<Map<string, string>>(new Map());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [autoMatchCount, setAutoMatchCount] = useState(0);
  const scanStarted = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Start face scanning on mount — only show photos with faces
  useEffect(() => {
    if (scanStarted.current) return;
    scanStarted.current = true;

    scanPhotos(smartPhotos, setScanProgress)
      .then((results) => {
        // Only keep photos that actually have faces
        const withFaces = results.filter((p) => p.faceCount > 0);
        setScannedPhotos(withFaces);
        setScanStatus("done");
      })
      .catch(() => {
        setScanStatus("failed");
      });
  }, [smartPhotos]);

  // Filter out assigned and skipped photos
  const visiblePhotos = useMemo(
    () =>
      scannedPhotos.filter(
        (p) => !assigned.has(p.media.url) && !skipped.has(p.media.url)
      ),
    [scannedPhotos, assigned, skipped]
  );
  const current = visiblePhotos[currentIdx];

  // Count how many unique members have been assigned + fast lookup Set
  const assignedMembers = useMemo(
    () => new Set(assigned.values()),
    [assigned]
  );
  const assignedMemberCount = assignedMembers.size;

  // Exit when no photos remain (after scanning is done)
  useEffect(() => {
    if (scanStatus !== "done") return;
    if (visiblePhotos.length === 0 && scannedPhotos.length > 0) {
      onDone();
    }
  }, [visiblePhotos.length, scannedPhotos.length, scanStatus, onDone]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    hapticTap();
    const newSkipped = new Set(skipped);
    newSkipped.add(current.media.url);
    setSkipped(newSkipped);

    const nextVisible = scannedPhotos.filter(
      (p) =>
        !assigned.has(p.media.url) && !newSkipped.has(p.media.url)
    );
    if (nextVisible.length === 0) {
      onDone();
    } else {
      setCurrentIdx((prev) => Math.min(prev, nextVisible.length - 1));
    }
  }, [current, skipped, scannedPhotos, assigned, onDone]);

  const handleAssign = useCallback(
    (displayName: string) => {
      if (!current) return;
      hapticSuccess();

      onAssign(displayName, current.media.url);

      const newAssigned = new Map(assigned);
      newAssigned.set(current.media.url, displayName);

      // Auto-match: find other photos with the same face
      if (current.faces.length > 0 && current.faces[0].embedding.length > 0) {
        const matches = findMatchingPhotos(
          current,
          scannedPhotos,
          new Set(newAssigned.keys())
        );

        let autoCount = 0;
        for (const matchUrl of matches) {
          onAssign(displayName, matchUrl);
          newAssigned.set(matchUrl, displayName);
          autoCount++;
        }

        if (autoCount > 0) {
          setAutoMatchCount(autoCount);
          const t1 = setTimeout(() => setAutoMatchCount(0), 3000);
          timersRef.current.push(t1);
        }
      }

      setAssigned(newAssigned);

      // Advance after brief delay
      const t2 = setTimeout(() => {
        const nextVisible = scannedPhotos.filter(
          (p) =>
            !newAssigned.has(p.media.url) && !skipped.has(p.media.url)
        );
        if (nextVisible.length === 0) {
          onDone();
        } else {
          setCurrentIdx((prev) => Math.min(prev, nextVisible.length - 1));
        }
      }, 400);
      timersRef.current.push(t2);
    },
    [current, assigned, skipped, scannedPhotos, onAssign, onDone]
  );

  // No photos at all — exit via effect (not during render)
  const hasNoPhotos = smartPhotos.length === 0;
  const scanFailed = scanStatus === "failed" || (scanStatus === "done" && scannedPhotos.length === 0);

  useEffect(() => {
    if (hasNoPhotos) onDone();
  }, [hasNoPhotos, onDone]);

  useEffect(() => {
    if (scanFailed) onDone();
  }, [scanFailed, onDone]);

  // All hooks above — early returns below
  if (hasNoPhotos) return null;

  // --- Scanning state: show loading overlay ---
  if (scanStatus === "scanning") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F0B1E]"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6 text-[48px]"
        >
          📷
        </motion.div>
        <p className="mb-2 text-[18px] font-bold text-white">
          סורק פנים בתמונות...
        </p>
        <p className="mb-6 text-[14px] text-[#9B96B0]">
          {scanProgress.current} / {scanProgress.total}
        </p>
        {/* Progress bar */}
        <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-[#252040]">
          <motion.div
            className="h-full rounded-full bg-[#8B5CF6]"
            animate={{
              width: scanProgress.total > 0
                ? `${(scanProgress.current / scanProgress.total) * 100}%`
                : "0%",
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <button
          onClick={onDone}
          className="mt-8 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-[14px] font-medium text-[#9B96B0] transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          דלגו על שלב זה
        </button>
      </motion.div>
    );
  }

  if (scanFailed) return null;

  // All photos handled
  if (visiblePhotos.length === 0 || !current) {
    return null;
  }

  const assignedTo = assigned.get(current.media.url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0F0B1E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onDone}
          className="rounded-lg bg-[#252040] px-3 py-1.5 text-[13px] font-medium text-[#9B96B0] transition-colors hover:bg-[#352F55] hover:text-white"
        >
          סיום
        </button>
        <div className="text-center">
          <h2 className="text-[16px] font-bold text-white">מי בתמונה?</h2>
          <p className="text-[12px] text-[#9B96B0]">
            {assignedMemberCount} / {profiles.length} חברים זוהו
          </p>
        </div>
        <div className="text-[12px] text-[#9B96B0]">
          {currentIdx + 1} / {visiblePhotos.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[#252040]" dir="ltr">
        <motion.div
          className="h-full bg-[#8B5CF6]"
          initial={false}
          animate={{
            width: `${((currentIdx + 1) / visiblePhotos.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Photo display */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.media.url}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[50vh] w-full max-w-sm overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl"
          >
            <img
              src={current.media.url}
              alt="תמונה לזיהוי"
              className="h-full w-full object-contain"
              style={{ imageOrientation: "from-image" }}
              draggable={false}
            />

            {/* Face count badge */}
            {current.faceCount > 1 && !assignedTo && (
              <div
                className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
                style={{ WebkitBackdropFilter: "blur(12px)" }}
              >
                {current.faceCount} פרצופים
              </div>
            )}

            {assignedTo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <div className="rounded-full bg-[#8B5CF6] px-4 py-2 text-[15px] font-bold text-white">
                  {assignedTo}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Sender hint */}
        {current.sender && !assignedTo && (
          <motion.p
            key={`hint-${current.media.url}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-[13px] text-[#9B96B0]"
          >
            נשלח על ידי{" "}
            <span className="font-medium text-white">{current.sender}</span>
          </motion.p>
        )}

        {/* Auto-match notification */}
        <AnimatePresence>
          {autoMatchCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 rounded-full bg-[#F5C542]/20 px-3 py-1 text-[13px] font-medium text-[#F5C542]"
            >
              זוהו עוד {autoMatchCount} תמונות עם אותו פרצוף
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Member grid — 2 columns + skip button */}
      <div className="border-t border-[#252040] px-3 pb-6 pt-3">
        <div className="grid grid-cols-2 gap-2" dir="rtl">
          {profiles.map((profile) => {
            const isSender =
              current.sender === profile.displayName ||
              current.sender === profile.nickname;
            const isAssignedElsewhere = assignedMembers.has(profile.displayName);

            return (
              <motion.button
                key={profile.displayName}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAssign(profile.displayName)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right transition-all ${
                  isSender
                    ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/20 shadow-[0_0_12px_rgba(139, 92, 246,0.3)]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.displayName}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[16px]">
                    {profile.personalityEmoji}
                  </span>
                )}
                <span className="min-w-0 truncate text-[13px] font-medium text-white">
                  {profile.nickname}
                </span>
                {isAssignedElsewhere && (
                  <span className="mr-auto text-[11px] text-[#8B5CF6]">✓</span>
                )}
              </motion.button>
            );
          })}
        </div>
        {/* Single skip button */}
        {!assignedTo && (
          <button
            onClick={handleSkip}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-[13px] font-medium text-[#9B96B0] transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            דלג על התמונה
          </button>
        )}
      </div>
    </motion.div>
  );
}
