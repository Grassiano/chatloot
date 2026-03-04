"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseWhatsAppChat } from "@/lib/parser/parse-chat";
import { extractUpload } from "@/lib/parser/extract-files";
import type { ParsedChat } from "@/lib/parser/types";
import { ParsedResults } from "@/components/upload/parsed-results";
import Link from "next/link";

type UploadState = "idle" | "extracting" | "parsing" | "done" | "error";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [parsedChat, setParsedChat] = useState<ParsedChat | null>(null);
  const [mediaCount, setMediaCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  async function handleUpload(input: File | FileList) {
    setState("extracting");
    setErrorMsg("");
    try {
      const extracted = await extractUpload(input);
      setMediaCount(extracted.media.size);

      setState("parsing");
      const result = await parseWhatsAppChat(
        extracted.chatText,
        extracted.media
      );
      setParsedChat(result);
      setState("done");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "unknown";
      if (msg === "no_chat_file") {
        setErrorMsg("לא נמצא קובץ צ׳אט (.txt) בתוך הקובץ/תיקייה");
      } else if (msg === "unsupported_file_type") {
        setErrorMsg("הקובץ לא נתמך. העלו קובץ .zip או .txt");
      } else {
        setErrorMsg("לא הצלחתי לקרוא את הקובץ");
      }
      setState("error");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const items = e.dataTransfer.items;

    // Check if it's a folder drop
    if (items.length > 0) {
      const firstItem = items[0];
      const entry = firstItem.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        // Folder drop — read all files
        readDirectoryFiles(entry as FileSystemDirectoryEntry).then(
          (fileList) => {
            if (fileList.length > 0) handleUpload(fileList);
          }
        );
        return;
      }
    }

    // Single file drop
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      handleUpload(files[0]);
    } else {
      // Multiple files (folder upload)
      handleUpload(files);
    }
  }

  const isProcessing = state === "extracting" || state === "parsing";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white shadow-md">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8 8-8z" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[15px] font-medium">ChatLoot</h1>
          <p className="text-[11px] opacity-75">העלאת צ׳אט קבוצתי</p>
        </div>
      </header>

      <main className="chat-wallpaper flex-1 px-3 py-4">
        <div className="mx-auto max-w-2xl">
          {/* Instruction */}
          <div className="mb-4 flex justify-center">
            <span className="rounded-lg bg-[#FFE9B2]/70 px-3 py-1.5 text-center text-[12px] leading-relaxed text-[#54656F] shadow-sm">
              איך מייצאים? נכנסים לקבוצה → שלוש נקודות → עוד → ייצוא צ׳אט →
              כולל מדיה
            </span>
          </div>

          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {/* ZIP upload — primary action */}
                <div
                  className="flex justify-start"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                >
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="group relative max-w-[85%] cursor-pointer rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm transition-shadow hover:shadow-md sm:max-w-[70%]"
                  >
                    {/* Hidden file inputs */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".zip,.txt"
                      onChange={onFileInput}
                      className="hidden"
                    />
                    <input
                      ref={folderRef}
                      type="file"
                      // @ts-expect-error webkitdirectory is not in the type definitions
                      webkitdirectory=""
                      onChange={onFileInput}
                      className="hidden"
                    />

                    {/* ZIP icon */}
                    <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#d3f0b5] p-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#00A884] text-white">
                        <svg
                          viewBox="0 0 24 24"
                          width="22"
                          height="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-loot-ink">
                          קובץ ZIP או TXT
                        </p>
                        <p className="text-[12px] text-loot-ink-secondary">
                          גררו לכאן או לחצו לבחירה
                        </p>
                      </div>
                    </div>

                    <p className="text-[13px] leading-snug text-loot-ink">
                      העלו את קובץ ה-ZIP שוואטסאפ יצר, או קובץ .txt בלבד.
                    </p>
                    <p className="mt-1 text-[12px] text-loot-ink-secondary">
                      ZIP כולל גם תמונות, סרטונים והודעות קוליות.
                    </p>

                    <p className="mt-1.5 text-left text-[10.5px] text-loot-ink-secondary">
                      עכשיו
                    </p>

                    <div className="absolute inset-0 rounded-lg border-2 border-transparent transition-colors group-hover:border-[#00A884]/30" />
                  </div>
                </div>

                {/* Folder upload — secondary option */}
                <div className="flex justify-start">
                  <button
                    onClick={() => folderRef.current?.click()}
                    className="max-w-[85%] rounded-lg rounded-tr-none bg-white p-3 text-right shadow-sm transition-shadow hover:shadow-md sm:max-w-[70%]"
                  >
                    <p className="text-[12px] font-medium text-[#00A884]">
                      ChatLoot
                    </p>
                    <p className="text-[13.5px] text-loot-ink">
                      כבר פתחתם את ה-ZIP?{" "}
                      <span className="font-medium text-[#00A884] underline decoration-[#00A884]/30 underline-offset-2">
                        העלו תיקייה שלמה
                      </span>
                    </p>
                    <p className="mt-1 text-left text-[10.5px] text-loot-ink-secondary">
                      עכשיו
                    </p>
                  </button>
                </div>

                {/* Privacy note */}
                <div className="flex justify-center pt-1">
                  <span className="rounded-lg bg-[#FFE9B2]/50 px-3 py-1 text-center text-[11px] text-[#54656F]">
                    🔒 הכל רץ מקומית בדפדפן. אנחנו לא שומרים כלום.
                  </span>
                </div>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#DCF8C6] p-4 shadow-sm">
                  <p className="mb-2 text-[12px] font-medium text-[#00A884]">
                    ChatLoot
                  </p>
                  <div className="mb-2 flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear",
                      }}
                      className="h-5 w-5 rounded-full border-2 border-[#00A884] border-t-transparent"
                    />
                    <p className="text-[14px] font-medium text-loot-ink">
                      {state === "extracting"
                        ? "פותח את הקבצים..."
                        : "מנתח את הצ׳אט..."}
                    </p>
                  </div>
                  <p className="text-[12px] text-loot-ink-secondary">
                    {state === "extracting"
                      ? "מחלץ תמונות, סרטונים והודעות קוליות"
                      : `מזהה חברים, סופר הודעות${mediaCount > 0 ? `, ${mediaCount} קבצי מדיה` : ""}`}
                  </p>
                </div>
              </motion.div>
            )}

            {state === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-lg rounded-tr-none bg-white p-4 shadow-sm">
                  <p className="mb-2 text-[14px] text-loot-ink">
                    {errorMsg || "לא הצלחתי לקרוא את הקובץ"} 😕
                  </p>
                  <p className="mb-3 text-[12px] text-loot-ink-secondary">
                    וודאו שזה קובץ ZIP או TXT שיוצא מוואטסאפ
                  </p>
                  <button
                    onClick={() => {
                      setState("idle");
                      setParsedChat(null);
                      setErrorMsg("");
                    }}
                    className="rounded-full bg-[#00A884] px-4 py-1.5 text-[13px] font-medium text-white"
                  >
                    נסו שוב
                  </button>
                </div>
              </motion.div>
            )}

            {state === "done" && parsedChat && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ParsedResults chat={parsedChat} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/** Read all files from a dropped directory recursively */
async function readDirectoryFiles(
  dirEntry: FileSystemDirectoryEntry
): Promise<FileList> {
  const files: File[] = [];

  async function readEntries(
    reader: FileSystemDirectoryReader
  ): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  }

  async function processEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await readEntries(reader);
      await Promise.all(entries.map(processEntry));
    }
  }

  const reader = dirEntry.createReader();
  const entries = await readEntries(reader);
  await Promise.all(entries.map(processEntry));

  // Convert to FileList-like via DataTransfer
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}
