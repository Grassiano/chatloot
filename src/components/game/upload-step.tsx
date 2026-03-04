"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface UploadStepProps {
  onUpload: (input: File | FileList) => Promise<void>;
}

export function UploadStep({ onUpload }: UploadStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(input: File | FileList) {
    setIsLoading(true);
    setError("");
    try {
      await onUpload(input);
    } catch {
      setError("לא הצלחתי לקרוא את הקובץ");
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-3 py-4"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-center">
          <span className="rounded-lg bg-[#FFE9B2]/70 px-3 py-1.5 text-center text-[12px] text-[#54656F] shadow-sm">
            העלו את הצ׳אט כדי להתחיל לשחק
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-start">
            <div className="rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="h-5 w-5 rounded-full border-2 border-[#00A884] border-t-transparent"
                />
                <p className="text-[14px] font-medium text-[#111B21]">
                  מכין את המשחק...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-start"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <div
              onClick={() => fileRef.current?.click()}
              className="group relative max-w-[85%] cursor-pointer rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm transition-shadow hover:shadow-md sm:max-w-[70%]"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".zip,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />

              <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#d3f0b5] p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#00A884] text-white">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#111B21]">
                    העלו קובץ ZIP או TXT
                  </p>
                  <p className="text-[12px] text-[#667781]">
                    גררו או לחצו לבחירה
                  </p>
                </div>
              </div>

              <div className="absolute inset-0 rounded-lg border-2 border-transparent transition-colors group-hover:border-[#00A884]/30" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex justify-start">
            <div className="rounded-lg rounded-tr-none bg-white p-3 shadow-sm">
              <p className="text-[13px] text-[#111B21]">{error} 😕</p>
              <button
                onClick={() => setError("")}
                className="mt-2 rounded-full bg-[#00A884] px-3 py-1 text-[12px] font-medium text-white"
              >
                נסו שוב
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
