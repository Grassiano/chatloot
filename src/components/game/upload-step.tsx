"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { ExtractionProgress, ExtractionStage } from "@/lib/parser/types";

const STAGE_LABELS: Record<ExtractionStage, string> = {
  reading_zip: "קורא את הקובץ...",
  finding_chat: "מחפש את הצ׳אט...",
  parsing_messages: "מנתח הודעות...",
  extracting_media: "מחלץ קבצי מדיה...",
};

const STAGE_ORDER: ExtractionStage[] = [
  "reading_zip",
  "finding_chat",
  "parsing_messages",
  "extracting_media",
];

interface UploadStepProps {
  onUpload: (input: File | FileList) => Promise<void>;
  extractionProgress?: ExtractionProgress | null;
}

export function UploadStep({ onUpload, extractionProgress }: UploadStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  async function handleFile(input: File | FileList) {
    // Show file/folder name
    if (input instanceof File) {
      setFileName(input.name);
    } else if (input.length > 0) {
      // For FileList (folder), show folder name from webkitRelativePath or file count
      const first = input[0];
      const folderName = first.webkitRelativePath?.split("/")[0];
      setFileName(folderName || `${input.length} קבצים`);
    }
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
        no_chat_file: "לא נמצא קובץ צ׳אט בתוך ה-ZIP או התיקייה",
        too_many_files: "יותר מדי קבצים",
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

      // Collect all files — handles folders, ZIPs, loose files, anything
      const allFiles = await collectDroppedFiles(e.dataTransfer);

      if (allFiles.length === 0) {
        setError("לא הצלחתי לקרוא את מה שגררתם — נסו שוב או לחצו לבחירה");
        return;
      }

      if (allFiles.length === 1) {
        handleFile(allFiles[0]);
      } else {
        // Multiple files — build a FileList
        const dt = new DataTransfer();
        for (const f of allFiles) dt.items.add(f);
        handleFile(dt.files);
      }
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
              תיקייה, ZIP, קובץ טקסט, הכל עובד
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
            <div className="w-full max-w-sm rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm">
              {/* Stage label */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={extractionProgress?.stage ?? "init"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-3 text-[14px] font-medium text-[#111B21]"
                >
                  {extractionProgress
                    ? STAGE_LABELS[extractionProgress.stage]
                    : "מכין את המשחק..."}
                </motion.p>
              </AnimatePresence>

              {/* Progress bar — 4 segments, forced LTR so fill goes left→right */}
              <div className="mb-2 flex gap-1" dir="ltr">
                {STAGE_ORDER.map((stage, i) => {
                  const currentIdx = extractionProgress
                    ? STAGE_ORDER.indexOf(extractionProgress.stage)
                    : -1;
                  const isCompleted = i < currentIdx;
                  const isCurrent = i === currentIdx;

                  let fillPercent = 10;
                  if (isCurrent && extractionProgress?.total) {
                    fillPercent = Math.max(
                      10,
                      (extractionProgress.current / extractionProgress.total) * 100
                    );
                  }

                  return (
                    <div
                      key={stage}
                      className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#00A884]/20"
                    >
                      {isCompleted && (
                        <div className="absolute inset-0 rounded-full bg-[#00A884]" />
                      )}
                      {isCurrent && (
                        <motion.div
                          key={`bar-${stage}`}
                          className="absolute inset-y-0 left-0 rounded-full bg-[#00A884]"
                          initial={{ width: "5%" }}
                          animate={{
                            width: extractionProgress?.total
                              ? `${fillPercent}%`
                              : ["5%", "60%", "90%", "60%"],
                          }}
                          transition={
                            extractionProgress?.total
                              ? { duration: 0.3, ease: "easeOut" }
                              : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* File counter during media extraction */}
              {extractionProgress?.stage === "extracting_media" &&
                extractionProgress.total > 0 && (
                  <p className="text-[12px] tabular-nums text-[#667781]">
                    {extractionProgress.current.toLocaleString()} /{" "}
                    {extractionProgress.total.toLocaleString()} קבצים
                  </p>
                )}

              {/* File name */}
              {fileName && !extractionProgress && (
                <p className="text-[12px] text-[#667781]" dir="auto">
                  {fileName}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* File input — ZIP / TXT */}
            <input
              ref={fileRef}
              type="file"
              accept=".zip,.txt"
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                handleFile(files[0]);
              }}
              className="hidden"
            />
            {/* Folder input — webkitdirectory set via ref */}
            <input
              ref={(el) => {
                (folderRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                if (el) el.setAttribute("webkitdirectory", "");
              }}
              type="file"
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                handleFile(files);
              }}
              className="hidden"
            />

            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm sm:max-w-[75%]">
                <p className="mb-3 text-[14px] font-medium text-[#111B21]">
                  העלו את הייצוא מוואטסאפ
                </p>
                <p className="mb-4 text-[12px] text-[#667781]">
                  גררו לכאן או בחרו קובץ / תיקייה
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-3 rounded-lg bg-[#d3f0b5] p-3 transition-colors hover:bg-[#c5e8a3] active:scale-[0.98]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00A884] text-white">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-medium text-[#111B21]">
                        קובץ ZIP או TXT
                      </p>
                      <p className="text-[11px] text-[#667781]">
                        הייצוא מוואטסאפ כקובץ בודד
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => folderRef.current?.click()}
                    className="flex items-center gap-3 rounded-lg bg-[#d3f0b5] p-3 transition-colors hover:bg-[#c5e8a3] active:scale-[0.98]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00A884] text-white">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-medium text-[#111B21]">
                        תיקייה
                      </p>
                      <p className="text-[11px] text-[#667781]">
                        התיקייה שנוצרה מהייצוא
                      </p>
                    </div>
                  </button>
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

/**
 * Collect all files from a drop event — handles:
 * - Single file (ZIP, TXT, media)
 * - Multiple files
 * - Folder drops (via webkitGetAsEntry directory traversal)
 */
async function collectDroppedFiles(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const allFiles: File[] = [];

  // First, try the directory entry API for each item
  if (dataTransfer.items?.length > 0) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const entry = dataTransfer.items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isDirectory) {
          const files = await readAllEntries(
            entry as FileSystemDirectoryEntry
          );
          allFiles.push(...files);
        } else if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          );
          allFiles.push(file);
        }
      }
      if (allFiles.length > 0) return allFiles;
    }
  }

  // Fallback: use dataTransfer.files
  for (let i = 0; i < dataTransfer.files.length; i++) {
    allFiles.push(dataTransfer.files[i]);
  }

  return allFiles;
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
