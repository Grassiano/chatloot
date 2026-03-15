/**
 * Face scanner — uses @vladmandic/human for face detection + embedding extraction.
 * Runs entirely client-side in the browser.
 *
 * Flow:
 * 1. scanPhotos() → detect faces + extract embeddings for all candidate photos
 * 2. findMatchingPhotos() → after GM assigns a face, find all photos with same face
 */

import type { SmartPhoto } from "./photo-utils";

/** A single detected face with its embedding vector */
export interface DetectedFace {
  /** 128-dim face descriptor for similarity matching */
  embedding: number[];
  /** Bounding box as ratio of image dimensions (0-1) */
  box: { x: number; y: number; w: number; h: number };
  /** Detection confidence 0-1 */
  confidence: number;
  /** Ratio of face area to total image area */
  areaRatio: number;
}

/** A scanned photo with face detection results */
export interface ScannedPhoto extends SmartPhoto {
  faces: DetectedFace[];
  faceCount: number;
  /** Best single-face photo for profile use */
  isProfileCandidate: boolean;
}

export interface ScanProgress {
  current: number;
  total: number;
  stage: "loading_model" | "scanning";
}

// Lazy-loaded Human instance
let humanInstance: Awaited<ReturnType<typeof createHuman>> | null = null;

async function createHuman() {
  // Dynamic import — only loaded when face scanning is needed
  const { default: Human } = await import("@vladmandic/human");

  const human = new Human({
    backend: "webgl",
    modelBasePath: "https://vladmandic.github.io/human-models/models/",
    face: {
      enabled: true,
      detector: {
        enabled: true,
        maxDetected: 10,
        rotation: false,
      },
      mesh: { enabled: false },
      iris: { enabled: false },
      description: {
        enabled: true, // This gives us face embeddings!
        minConfidence: 0.3,
      },
      emotion: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
    object: { enabled: false },
  });

  await human.load();
  await human.warmup();
  return human;
}

async function getHuman() {
  if (!humanInstance) {
    humanInstance = await createHuman();
  }
  return humanInstance;
}

/**
 * Pre-load the face detection model in the background.
 * Call early (e.g. during GroupReveal) so the model is ready
 * by the time PhotoMatcher mounts.
 */
export function preloadFaceModel(): void {
  getHuman().catch(() => {});
}

/**
 * Load an image URL into an HTMLImageElement for processing.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Scan a batch of SmartPhotos — detect faces and extract embeddings.
 * Returns ScannedPhotos sorted by usefulness (profile candidates first).
 */
export async function scanPhotos(
  photos: SmartPhoto[],
  onProgress?: (progress: ScanProgress) => void
): Promise<ScannedPhoto[]> {
  onProgress?.({ current: 0, total: photos.length, stage: "loading_model" });

  const human = await getHuman();

  onProgress?.({ current: 0, total: photos.length, stage: "scanning" });

  const results: ScannedPhoto[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    try {
      const img = await loadImage(photo.media.url);
      const result = await human.detect(img);
      const imageArea = img.naturalWidth * img.naturalHeight;

      const faces: DetectedFace[] = (result.face ?? []).map((face) => {
        const [x, y, w, h] = face.box;
        return {
          embedding: face.embedding ? Array.from(face.embedding) : [],
          box: {
            x: x / img.naturalWidth,
            y: y / img.naturalHeight,
            w: w / img.naturalWidth,
            h: h / img.naturalHeight,
          },
          confidence: face.score ?? 0,
          areaRatio: (w * h) / imageArea,
        };
      });

      // Filter out tiny faces (likely background people)
      const meaningfulFaces = faces.filter((f) => f.areaRatio > 0.01);

      const isProfileCandidate =
        meaningfulFaces.length === 1 && meaningfulFaces[0].areaRatio > 0.04;

      results.push({
        ...photo,
        faces: meaningfulFaces,
        faceCount: meaningfulFaces.length,
        isProfileCandidate,
        // Boost score based on face detection
        score:
          photo.score +
          (meaningfulFaces.length === 1 ? 30 : 0) +
          (isProfileCandidate ? 20 : 0) +
          (meaningfulFaces.length === 0 ? -50 : 0),
      });
    } catch {
      // Image failed to load — skip it
      results.push({
        ...photo,
        faces: [],
        faceCount: 0,
        isProfileCandidate: false,
        score: photo.score - 30,
      });
    }

    onProgress?.({ current: i + 1, total: photos.length, stage: "scanning" });
  }

  // Filter out photos with no faces, then sort by score
  const withFaces = results.filter((p) => p.faceCount > 0);
  withFaces.sort((a, b) => b.score - a.score);

  return withFaces;
}

/**
 * Cosine similarity between two face embeddings.
 * Returns value between -1 and 1 (higher = more similar).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/** Threshold for considering two faces as the same person */
const MATCH_THRESHOLD = 0.5;

/**
 * After GM assigns a photo to a member, find all other photos
 * containing the same face. Returns URLs of matching photos.
 */
export function findMatchingPhotos(
  /** The photo that was just assigned */
  assignedPhoto: ScannedPhoto,
  /** All scanned photos (including unassigned ones) */
  allPhotos: ScannedPhoto[],
  /** URLs of photos already assigned to any member */
  alreadyAssigned: Set<string>
): string[] {
  // Get the embedding of the assigned face (use the largest face)
  const refFace = assignedPhoto.faces
    .filter((f) => f.embedding.length > 0)
    .sort((a, b) => b.areaRatio - a.areaRatio)[0];

  if (!refFace) return [];

  const matches: string[] = [];

  for (const photo of allPhotos) {
    // Skip already-assigned photos
    if (alreadyAssigned.has(photo.media.url)) continue;
    // Skip the assigned photo itself
    if (photo.media.url === assignedPhoto.media.url) continue;

    // Check each face in this photo against the reference
    for (const face of photo.faces) {
      if (face.embedding.length === 0) continue;

      const similarity = cosineSimilarity(refFace.embedding, face.embedding);
      if (similarity >= MATCH_THRESHOLD) {
        matches.push(photo.media.url);
        break; // One match per photo is enough
      }
    }
  }

  return matches;
}
