"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaFile } from "@/lib/parser/types";

interface PhotoGalleryProps {
  media: Map<string, MediaFile>;
  memberNames: string[];
  onTag: (memberName: string, photoUrl: string) => void;
  onUpload: (memberName: string, url: string, blob: Blob) => void;
  onClose: () => void;
  /** Which member we're tagging photos for */
  targetMember: string;
}

export function PhotoGallery({
  media,
  memberNames,
  onTag,
  onUpload,
  onClose,
  targetMember,
}: PhotoGalleryProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to images only
  const images = Array.from(media.entries()).filter(
    ([, file]) => file.type === "image"
  );

  const toggleSelect = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    for (const url of selected) {
      onTag(targetMember, url);
    }
    onClose();
  }, [selected, targetMember, onTag, onClose]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onUpload(targetMember, url, file);
      onClose();
    },
    [targetMember, onUpload, onClose]
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="text-[14px] font-medium text-white/70 transition-colors hover:text-white"
          >
            ביטול
          </button>
          <h2 className="text-[16px] font-bold text-white">
            תמונות של {targetMember}
          </h2>
          <div className="w-12" />
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto px-2 pb-24">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <p className="text-[16px] text-white/60">
                לא נמצאו תמונות בייצוא
              </p>
              <p className="mt-2 text-[13px] text-white/40">
                העלו תמונה מהמכשיר
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {images.map(([fileName, file]) => {
                const isSelected = selected.has(file.url);
                return (
                  <motion.button
                    key={fileName}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSelect(file.url)}
                    className="relative aspect-square overflow-hidden rounded-md"
                  >
                    <img
                      src={file.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-[#00A884]/40"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A884]">
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-6 pt-10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-full bg-white/10 px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/20"
          >
            העלאה מהמכשיר
          </button>
          {selected.size > 0 && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleConfirm}
              className="flex-1 rounded-full bg-[#00A884] px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#00A884]/90"
            >
              שייכו {selected.size} תמונות
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
