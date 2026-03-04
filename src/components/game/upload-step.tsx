"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface UploadStepProps {
  onUpload: (input: File | FileList) => Promise<void>;
}

export function UploadStep({ onUpload }: UploadStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  async function handleFile(input: File | FileList) {
    setIsLoading(true);
    setError("");
    setIsDragging(false);
    try {
      await onUpload(input);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "";
      const errorMap: Record<string, string> = {
        unsupported_file_type: "סוג קובץ לא נתמך — העלו קובץ ZIP או TXT",
        no_chat_file: "לא נמצא קובץ צ׳אט בתוך ה-ZIP",
        too_many_files: "יותר מדי קבצים ב-ZIP",
        zip_too_large: "הקובץ גדול מדי",
        file_too_large: "הקובץ גדול מדי",
        no_messages_parsed:
          "לא הצלחתי לזהות הודעות — ודאו שזה ייצוא צ׳אט מוואטסאפ",
        not_enough_members:
          "נמצא פחות מ-2 חברים — צריך צ׳אט קבוצתי עם לפחות 2 משתתפים",
        no_eligible_messages:
          "לא נמצאו מספיק הודעות טקסט למשחק — צריך צ׳אט עם הודעות ארוכות יותר",
      };
      setError(
        errorMap[message] ?? "לא הצלחתי לקרוא את הקובץ"
      );
      setIsLoading(false);
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragging(false);

      // Try directory entry API first (handles folder drops)
      const items = e.dataTransfer.items;
      if (items?.length > 0) {
        const entry = items[0].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          try {
            const fileList = await readDirectoryAsFileList(
              entry as FileSystemDirectoryEntry
            );
            if (fileList.length > 0) {
              handleFile(fileList);
              return;
            }
          } catch {
            // Directory API failed — fall through to file check
          }
        }
      }

      // Fallback: regular file(s) drop
      const { files } = e.dataTransfer;
      if (files.length > 0) {
        if (files.length === 1) {
          handleFile(files[0]);
        } else {
          handleFile(files);
        }
        return;
      }

      // Nothing was droppable — show error
      setError("לא הצלחתי לקרוא את מה שגררתם — נסו לבחור קובץ ZIP או תיקייה דרך הכפתור");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-[calc(100vh-52px)] px-3 py-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#075E54]/90 backdrop-blur-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                width="40"
                height="40"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </motion.div>
            <p className="text-[18px] font-bold text-white">
              שחררו כאן
            </p>
            <p className="mt-1 text-[14px] text-white/70">
              ZIP, TXT, או תיקייה
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
          <>
            {/* Hidden file inputs */}
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
            <input
              ref={folderRef}
              type="file"
              {...{ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleFile(files);
              }}
              className="hidden"
            />

            {/* ZIP/TXT file button */}
            <div className="flex justify-start">
              <div
                onClick={() => fileRef.current?.click()}
                className="group relative max-w-[85%] cursor-pointer rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm transition-shadow hover:shadow-md sm:max-w-[70%]"
              >
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
                      גררו לכל מקום במסך או לחצו לבחירה
                    </p>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-lg border-2 border-transparent transition-colors group-hover:border-[#00A884]/30" />
              </div>
            </div>

            {/* Folder picker button */}
            <div className="mt-3 flex justify-start">
              <div
                onClick={() => folderRef.current?.click()}
                className="group relative max-w-[85%] cursor-pointer rounded-lg rounded-tr-none bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:max-w-[70%]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F2F5] text-[#54656F]">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#111B21]">
                      או בחרו תיקייה
                    </p>
                    <p className="text-[11px] text-[#667781]">
                      תיקיית הייצוא מוואטסאפ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 flex justify-start">
            <div className="rounded-lg rounded-tr-none bg-white p-3 shadow-sm">
              <p className="text-[13px] text-[#111B21]">{error}</p>
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

/** Read all files from a dropped directory using the FileSystem API */
async function readDirectoryAsFileList(
  dirEntry: FileSystemDirectoryEntry
): Promise<FileList> {
  const files = await readAllEntries(dirEntry);
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}

async function readAllEntries(
  dirEntry: FileSystemDirectoryEntry
): Promise<File[]> {
  const reader = dirEntry.createReader();
  const files: File[] = [];

  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  let batch = await readBatch();
  while (batch.length > 0) {
    for (const entry of batch) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject)
        );
        files.push(file);
      } else if (entry.isDirectory) {
        const nested = await readAllEntries(entry as FileSystemDirectoryEntry);
        files.push(...nested);
      }
    }
    batch = await readBatch();
  }

  return files;
}
