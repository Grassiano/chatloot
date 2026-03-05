import type { ParsedChat, MediaFile } from "@/lib/parser/types";

export interface SmartPhoto {
  media: MediaFile;
  /** Who sent this photo in the chat (null if unknown) */
  sender: string | null;
  /** Confidence this is a "people" photo vs meme/screenshot */
  score: number;
}

/**
 * Build a smart list of photos for the GM to match.
 * - Correlates each image to its sender via parsed messages
 * - Filters out likely non-people images (screenshots, stickers, tiny files)
 * - Scores and sorts: sender-known photos first, likely-portrait photos higher
 */
export function buildSmartPhotoList(chat: ParsedChat): SmartPhoto[] {
  const { messages, media } = chat;

  // Build fileName → sender map from parsed messages
  const senderMap = new Map<string, string>();
  for (const msg of messages) {
    if (!msg.author || !msg.attachment) continue;
    senderMap.set(msg.attachment.fileName, msg.author);
  }

  const results: SmartPhoto[] = [];

  for (const [fileName, file] of media) {
    if (file.type !== "image") continue;
    if (shouldSkipImage(fileName, file)) continue;

    const sender = senderMap.get(fileName) ?? null;
    const score = scorePhoto(fileName, file, sender);

    results.push({ media: file, sender, score });
  }

  // Sort: highest score first (most likely to be a useful people photo)
  results.sort((a, b) => b.score - a.score);

  // Cap at reasonable limit
  const MAX = 60;
  return results.slice(0, MAX);
}

/**
 * Filter out images that are almost certainly not photos of group members.
 */
function shouldSkipImage(fileName: string, file: MediaFile): boolean {
  const lower = fileName.toLowerCase();

  // Skip sticker-like webp files
  if (
    lower.endsWith(".webp") &&
    (lower.includes("stk") || lower.includes("sticker"))
  ) {
    return true;
  }

  // Skip very small files (likely thumbnails, emoji, stickers) — under 15KB
  if (file.blob.size < 15_000) return true;

  // Skip GIFs (typically memes/reactions, not people photos)
  if (lower.endsWith(".gif")) return true;

  return false;
}

/**
 * Score a photo for how likely it is to be useful for member matching.
 * Higher = show earlier to the GM.
 */
function scorePhoto(
  fileName: string,
  file: MediaFile,
  sender: string | null
): number {
  let score = 50; // baseline

  // Bonus: we know who sent it (GM gets a hint)
  if (sender) score += 20;

  // Bonus: larger files tend to be real photos, not screenshots
  if (file.blob.size > 200_000) score += 10;
  if (file.blob.size > 500_000) score += 5;

  // Penalty: very large files might be panoramas/documents
  if (file.blob.size > 5_000_000) score -= 10;

  // Bonus: JPG/JPEG are typically camera photos
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) score += 5;

  // Bonus: WhatsApp camera photos follow IMG-YYYYMMDD pattern
  if (lower.startsWith("img-")) score += 5;

  // Penalty: PNG is more likely screenshot
  if (lower.endsWith(".png")) score -= 10;

  // Penalty: filenames suggesting screenshots or forwarded content
  if (lower.includes("screenshot") || lower.includes("screen")) score -= 20;

  return score;
}

/**
 * Get photo counts per sender for stats display.
 */
export function getPhotoCountsBySender(
  chat: ParsedChat
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const msg of chat.messages) {
    if (!msg.author || !msg.attachment) continue;
    const media = chat.media.get(msg.attachment.fileName);
    if (media?.type !== "image") continue;
    counts.set(msg.author, (counts.get(msg.author) ?? 0) + 1);
  }

  return counts;
}
