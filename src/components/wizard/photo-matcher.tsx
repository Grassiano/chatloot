"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemberProfile } from "@/lib/wizard/types";
import type { SmartPhoto } from "@/lib/wizard/photo-utils";
import type { ScannedPhoto, ScanProgress } from "@/lib/wizard/face-scanner";
import { scanPhotos, findMatchingPhotos } from "@/lib/wizard/face-scanner";

interface PhotoMatcherProps {
  smartPhotos: SmartPhoto[];
  profiles: MemberProfile[];
  onAssign: (displayName: string, photoUrl: string) => void;
  onDone: () => void;
}

type Phase = "scanning" | "matching";

export function PhotoMatcher({
  smartPhotos,
  profiles,
  onAssign,
  onDone,
}: PhotoMatcherProps) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    current: 0,
    total: smartPhotos.length,
    stage: "loading_model",
  });
  const [scannedPhotos, setScannedPhotos] = useState<ScannedPhoto[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [assigned, setAssigned] = useState<Map<string, string>>(new Map());
  const [autoMatchCount, setAutoMatchCount] = useState(0);
  const [isEmpty, setIsEmpty] = useState(false);
  const scanStarted = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Start face scanning on mount
  useEffect(() => {
    if (scanStarted.current) return;
    scanStarted.current = true;

    scanPhotos(smartPhotos, setScanProgress)
      .then((results) => {
        if (results.length === 0) {
          setIsEmpty(true);
          return;
        }
        setScannedPhotos(results);
        setPhase("matching");
      })
      .catch(() => {
        // Face scanning failed — fall back to unscanned photos
        const fallback: ScannedPhoto[] = smartPhotos.map((p) => ({
          ...p,
          faces: [],
          faceCount: 0,
          isProfileCandidate: false,
        }));
        setScannedPhotos(fallback);
        setPhase("matching");
      });
  }, [smartPhotos]);

  // Skip already-assigned photos when navigating
  const visiblePhotos = useMemo(
    () => scannedPhotos.filter((p) => !assigned.has(p.media.url)),
    [scannedPhotos, assigned]
  );
  const current = visiblePhotos[currentIdx];
  const isLast = currentIdx >= visiblePhotos.length - 1;

  // Exit when no photos remain (replaces calling onDone() during render)
  useEffect(() => {
    if (isEmpty) onDone();
  }, [isEmpty, onDone]);

  useEffect(() => {
    if (phase === "matching" && visiblePhotos.length === 0) {
      onDone();
    }
  }, [phase, visiblePhotos.length, onDone]);

  const advance = useCallback(() => {
    if (isLast || visiblePhotos.length <= 1) {
      onDone();
    } else {
      setCurrentIdx((i) => Math.min(i + 1, visiblePhotos.length - 1));
    }
  }, [isLast, onDone, visiblePhotos.length]);

  const handleAssign = useCallback(
    (displayName: string) => {
      if (!current) return;

      // Assign this photo
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
          const t1 = setTimeout(() => setAutoMatchCount(0), 2000);
          timersRef.current.push(t1);
        }
      }

      setAssigned(newAssigned);

      // Advance after brief delay
      const t2 = setTimeout(() => {
        // Recalculate visible photos after assignment
        const nextVisible = scannedPhotos.filter(
          (p) => !newAssigned.has(p.media.url)
        );
        if (nextVisible.length === 0) {
          onDone();
        } else {
          setCurrentIdx((prev) => Math.min(prev, nextVisible.length - 1));
        }
      }, 400);
      timersRef.current.push(t2);
    },
    [current, assigned, scannedPhotos, onAssign, onDone]
  );

  // Scanning phase
  if (phase === "scanning") {
    const percent =
      scanProgress.total > 0
        ? Math.round((scanProgress.current / scanProgress.total) * 100)
        : 0;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0D1117]"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="mb-6 text-[48px]"
        >
          🔍
        </motion.div>
        <p className="mb-2 text-[18px] font-bold text-white">
          {scanProgress.stage === "loading_model"
            ? "טוען מודל זיהוי פנים..."
            : "סורק תמונות..."}
        </p>
        <p className="mb-6 text-[14px] text-[#8B949E]">
          {scanProgress.stage === "scanning"
            ? `${scanProgress.current} / ${scanProgress.total} תמונות`
            : "רגע אחד..."}
        </p>

        {/* Progress bar */}
        <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-[#21262D]" dir="ltr">
          <motion.div
            className="h-full rounded-full bg-[#00A884]"
            initial={{ width: "0%" }}
            animate={{
              width:
                scanProgress.stage === "loading_model"
                  ? ["0%", "30%", "50%"]
                  : `${percent}%`,
            }}
            transition={
              scanProgress.stage === "loading_model"
                ? { duration: 3, ease: "easeInOut" }
                : { duration: 0.3 }
            }
          />
        </div>

        <button
          onClick={onDone}
          className="mt-8 rounded-lg bg-[#21262D] px-4 py-2 text-[13px] text-[#8B949E] transition-colors hover:bg-[#30363D] hover:text-white"
        >
          דלגו על זיהוי פנים
        </button>
      </motion.div>
    );
  }

  // No photos with faces — useEffect above handles calling onDone()
  if (visiblePhotos.length === 0 || !current) {
    return null;
  }

  const assignedTo = assigned.get(current.media.url);
  const scannedCurrent = current as ScannedPhoto;

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
          <h2 className="text-[16px] font-bold text-white">מי בתמונה?</h2>
          <p className="text-[12px] text-[#8B949E]">
            {currentIdx + 1} / {visiblePhotos.length}
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
      <div className="h-1 w-full bg-[#21262D]" dir="ltr">
        <motion.div
          className="h-full bg-[#00A884]"
          initial={false}
          animate={{
            width: `${((currentIdx + 1) / visiblePhotos.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Photo display */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.media.url}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[45vh] w-full max-w-sm overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl"
          >
            <img
              src={current.media.url}
              alt="תמונה לזיהוי"
              className="h-full w-full object-contain"
              draggable={false}
            />

            {/* Face count badge */}
            {scannedCurrent.faceCount > 0 && !assignedTo && (
              <div className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md" style={{ WebkitBackdropFilter: "blur(12px)" }}>
                {scannedCurrent.faceCount === 1
                  ? "פרצוף אחד"
                  : `${scannedCurrent.faceCount} פרצופים`}
              </div>
            )}

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

        {/* Sender hint */}
        {current.sender && !assignedTo && (
          <motion.p
            key={`hint-${current.media.url}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-[13px] text-[#8B949E]"
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

      {/* Member chips — horizontal scroll, sender highlighted */}
      <div className="border-t border-[#21262D] px-3 pb-6 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2" dir="rtl">
          {profiles.map((profile) => {
            const isSender =
              current.sender === profile.displayName ||
              current.sender === profile.nickname;

            return (
              <motion.button
                key={profile.displayName}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleAssign(profile.displayName)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 transition-all ${
                  isSender
                    ? "border-[#00A884]/50 bg-[#00A884]/20 shadow-[0_0_12px_rgba(0,168,132,0.3)]"
                    : "border-white/10 bg-white/10 backdrop-blur-md hover:border-white/20 hover:bg-white/15"
                } active:bg-[#00A884]/30`}
                style={{ WebkitBackdropFilter: "blur(12px)" }}
              >
                <span className="text-[16px]">
                  {profile.personalityEmoji}
                </span>
                <span className="whitespace-nowrap text-[14px] font-medium text-white">
                  {profile.nickname}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
