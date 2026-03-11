"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface RoleCardProps {
  href: string;
  emoji: string;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

export function RoleCard({
  href,
  emoji,
  title,
  description,
  color,
  delay = 0,
}: RoleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col items-center gap-3 rounded-2xl border border-white/30 bg-white/85 px-6 py-8 shadow-md backdrop-blur-md transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm"
          style={{ backgroundColor: `${color}20` }}
        >
          {emoji}
        </div>
        <div className="text-center">
          <h2
            className="text-xl font-bold"
            style={{ color }}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-loot-ink-secondary">{description}</p>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: color }}
        />
      </Link>
    </motion.div>
  );
}
