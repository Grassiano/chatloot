"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  progress: number; // 0 to 1
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useTimer(
  durationSeconds: number,
  onComplete?: () => void
): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  const progress = timeLeft / durationSeconds;

  return { timeLeft, isRunning, progress, start, stop, reset };
}
