"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  shape: "square" | "circle" | "strip";
}

const COLORS = [
  "#F5C542", // gold
  "#8B5CF6", // teal
  "#FF4757", // red
  "#3B82F6", // blue
  "#EC4899", // pink
  "#00D68F", // green
  "#F97316", // orange
];

function createPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x: (Math.random() - 0.5) * 400,
    y: -(Math.random() * 600 + 200),
    rotation: Math.random() * 720 - 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    shape: (["square", "circle", "strip"] as const)[
      Math.floor(Math.random() * 3)
    ],
  }));
}

interface ConfettiProps {
  /** Whether confetti is active */
  active: boolean;
  /** Number of pieces (default 60) */
  count?: number;
  /** Duration in ms before auto-cleanup (default 3000) */
  duration?: number;
}

export function Confetti({
  active,
  count = 60,
  duration = 3000,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      setPieces(createPieces(count));
      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    } else {
      setPieces([]);
    }
  }, [active, count, duration]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: "50vw",
              y: "-10vh",
              rotate: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: `calc(50vw + ${piece.x}px)`,
              y: `calc(100vh + 50px)`,
              rotate: piece.rotation,
              opacity: [1, 1, 0.8, 0],
              scale: [1, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: Math.random() * 0.3,
            }}
            className="absolute"
            style={{
              width:
                piece.shape === "strip" ? piece.size * 0.4 : piece.size,
              height:
                piece.shape === "strip" ? piece.size * 2 : piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.shape === "circle" ? "50%" : "2px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Hook to trigger confetti imperatively */
export function useConfetti(duration = 3000) {
  const [active, setActive] = useState(false);

  const fire = useCallback(() => {
    setActive(true);
    const timer = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return { active, fire };
}
