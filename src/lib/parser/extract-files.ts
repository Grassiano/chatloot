import JSZip from "jszip";
import type { MediaFile, ExtractionProgress } from "./types";

const MAX_EXTRACTED_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_FILE_COUNT = 50_000;
const MAX_TXT_BYTES = 500 * 1024 * 1024; // 500 MB

/** Result of extracting an upload — the chat text + any media files */
export interface ExtractedUpload {
  chatText: string;
  media: Map<string, MediaFile>;
}

/**
 * Accepts a File (could be .txt, .zip) or a FileList (folder upload)
 * and extracts the chat text + media files.
 */
export async function extractUpload(
  files: File | FileList,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedUpload> {
  // Single file
  if (files instanceof File) {
    if (files.name.endsWith(".zip")) {
      return extractZip(files, onProgress);
    }
    if (files.name.endsWith(".txt")) {
      if (files.size > MAX_TXT_BYTES) throw new Error("file_too_large");
      onProgress?.({ stage: "parsing_messages", current: 0, total: 0 });
      return { chatText: await files.text(), media: new Map() };
    }
    throw new Error("unsupported_file_type");
  }

  // FileList (folder upload or multi-select)
  return extractFileList(files, onProgress);
}

/** Extract a WhatsApp export ZIP file */
async function extractZip(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedUpload> {
  onProgress?.({ stage: "reading_zip", current: 0, total: 0 });
  const zip = await JSZip.loadAsync(file);
  const media = new Map<string, MediaFile>();

  const entries = Object.entries(zip.files);

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error("too_many_files");
  }

  // Find the chat .txt file
  onProgress?.({ stage: "finding_chat", current: 0, total: entries.length });

  const txtEntry = entries.find(([name]) => {
    const basename = name.split("/").pop()?.toLowerCase() ?? "";
    return (
      basename.endsWith(".txt") &&
      !basename.startsWith(".") &&
      !basename.startsWith("__")
    );
  });

  if (!txtEntry) {
    throw new Error("no_chat_file");
  }

  onProgress?.({ stage: "parsing_messages", current: 0, total: 0 });
  const chatText = await txtEntry[1].async("text");

  // Extract media in batches for progress updates
  const mediaEntries = entries.filter(([name, entry]) => {
    if (entry.dir) return false;
    const basename = name.split("/").pop()?.toLowerCase() ?? "";
    if (basename.endsWith(".txt")) return false;
    if (basename.startsWith(".") || basename.startsWith("__")) return false;
    return isMediaFile(basename);
  });

  onProgress?.({ stage: "extracting_media", current: 0, total: mediaEntries.length });

  let accumulatedBytes = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < mediaEntries.length; i += BATCH_SIZE) {
    const batch = mediaEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([name, entry]) => {
        const basename = name.split("/").pop() ?? name;
        const rawBlob = await entry.async("blob");
        accumulatedBytes += rawBlob.size;
        if (accumulatedBytes > MAX_EXTRACTED_BYTES) {
          throw new Error("zip_too_large");
        }
        const mimeType = getMimeType(basename);
        const typedBlob = new Blob([rawBlob], { type: mimeType });
        const category = getMediaCategory(basename);
        // Normalize image orientation (bakes EXIF rotation into pixels)
        const finalBlob =
          category === "image"
            ? await normalizeImageOrientation(typedBlob)
            : typedBlob;
        const url = URL.createObjectURL(finalBlob);
        const mediaFile: MediaFile = {
          fileName: basename,
          blob: finalBlob,
          url,
          type: category,
        };
        return [basename, mediaFile] as const;
      })
    );

    for (const [name, mediaFile] of results) {
      media.set(name, mediaFile);
    }

    onProgress?.({
      stage: "extracting_media",
      current: Math.min(i + BATCH_SIZE, mediaEntries.length),
      total: mediaEntries.length,
    });
  }

  return { chatText, media };
}

/** Extract from a folder upload (FileList from webkitdirectory) */
async function extractFileList(
  files: FileList,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedUpload> {
  const media = new Map<string, MediaFile>();
  let chatText = "";

  onProgress?.({ stage: "finding_chat", current: 0, total: files.length });
  const fileArray = Array.from(files);

  // Find the .txt chat file
  const txtFile = fileArray.find((f) => {
    const name = f.name.toLowerCase();
    return name.endsWith(".txt") && !name.startsWith(".");
  });

  if (!txtFile) {
    throw new Error("no_chat_file");
  }

  onProgress?.({ stage: "parsing_messages", current: 0, total: 0 });
  chatText = await txtFile.text();

  // Process media files
  const mediaFiles = fileArray.filter((f) => {
    const name = f.name.toLowerCase();
    if (name.endsWith(".txt") || name.startsWith(".")) return false;
    return isMediaFile(name);
  });

  onProgress?.({ stage: "extracting_media", current: 0, total: mediaFiles.length });
  for (let i = 0; i < mediaFiles.length; i++) {
    const file = mediaFiles[i];
    const category = getMediaCategory(file.name);
    // Normalize image orientation (bakes EXIF rotation into pixels)
    const finalBlob =
      category === "image"
        ? await normalizeImageOrientation(file)
        : file;
    const url = URL.createObjectURL(finalBlob);
    media.set(file.name, {
      fileName: file.name,
      blob: finalBlob,
      url,
      type: category,
    });
    if (i % 20 === 0) {
      onProgress?.({ stage: "extracting_media", current: i + 1, total: mediaFiles.length });
    }
  }
  onProgress?.({ stage: "extracting_media", current: mediaFiles.length, total: mediaFiles.length });

  return { chatText, media };
}

function isMediaFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return [
    // Images
    "jpg", "jpeg", "png", "gif", "webp",
    // Video
    "mp4", "mov", "avi", "3gp",
    // Audio/voice
    "opus", "ogg", "m4a", "mp3", "aac",
    // Stickers
    "webp",
    // Documents
    "pdf", "doc", "docx",
  ].includes(ext);
}

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    "3gp": "video/3gpp",
    avi: "video/x-msvideo",
    opus: "audio/opus",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    aac: "audio/aac",
    pdf: "application/pdf",
    doc: "application/msword",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

function getMediaCategory(
  fileName: string
): "image" | "video" | "voice" | "sticker" | "document" {
  const name = fileName.toLowerCase();
  if (name.includes("ptt") || name.match(/\.(opus|ogg|m4a|mp3|aac)$/))
    return "voice";
  if (name.includes("stk") || (name.includes("sticker") && name.endsWith(".webp")))
    return "sticker";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
  if (name.match(/\.(mp4|mov|avi|3gp)$/)) return "video";
  return "document";
}

/**
 * Normalize image orientation using createImageBitmap + canvas.
 * This bakes the EXIF rotation into the pixel data so every consumer
 * (img tags, canvas, face detection) sees the correct orientation.
 */
async function normalizeImageOrientation(blob: Blob): Promise<Blob> {
  try {
    // createImageBitmap respects EXIF orientation by default
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;

    // Skip if image is tiny (sticker/thumbnail) — not worth the overhead
    if (width * height < 10000) {
      bitmap.close();
      return blob;
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Convert back to blob — use JPEG for photos (smaller), keep PNG for PNGs
    const isJpeg = blob.type === "image/jpeg" || blob.type === "image/jpg";
    const normalized = await canvas.convertToBlob({
      type: isJpeg ? "image/jpeg" : "image/png",
      quality: isJpeg ? 0.92 : undefined,
    });

    return normalized;
  } catch {
    // Fallback: return original blob if normalization fails
    return blob;
  }
}

/** Clean up object URLs when no longer needed */
export function revokeMediaUrls(media: Map<string, MediaFile>): void {
  for (const file of media.values()) {
    URL.revokeObjectURL(file.url);
  }
}
