"use client";

import { useRef, useCallback } from "react";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
}

/** 6-character room code input — one char per box, auto-advances */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
}: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const chars = value.padEnd(length, "").split("").slice(0, length);

  const handleChange = useCallback(
    (index: number, char: string) => {
      const sanitized = char.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!sanitized) return;

      const newChars = [...chars];
      newChars[index] = sanitized[0];
      const newValue = newChars.join("").replace(/ /g, "");
      onChange(newValue);

      // Auto-advance to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Fire onComplete when all chars filled
      if (newValue.length === length && onComplete) {
        onComplete(newValue);
      }
    },
    [chars, onChange, onComplete, length]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !chars[index]?.trim() && index > 0) {
        const newChars = [...chars];
        newChars[index - 1] = " ";
        onChange(newChars.join("").trimEnd());
        inputRefs.current[index - 1]?.focus();
      }
    },
    [chars, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, length);
      onChange(pasted);

      if (pasted.length === length && onComplete) {
        onComplete(pasted);
      }

      // Focus last filled input or the next empty one
      const focusIdx = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
    },
    [onChange, onComplete, length]
  );

  return (
    <div className="flex gap-2 justify-center" dir="ltr" onPaste={handlePaste}>
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={1}
          value={char.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-14 w-11 rounded-xl border-2 border-white/40 bg-white/80 text-center text-xl font-black text-loot-ink shadow-sm transition-all focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
          aria-label={`תו ${i + 1}`}
        />
      ))}
    </div>
  );
}
