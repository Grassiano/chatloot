/**
 * Sound effects engine using Web Audio API synthesis.
 * No external audio files — pure synthesized sounds.
 */

type SoundName = "correct" | "wrong" | "reveal" | "tick" | "celebration" | "streak";

const MUTE_KEY = "chatloot:muted";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "true";
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
}

export function getMuted(): boolean {
  return isMuted();
}

/** Play a named sound effect */
export function playSound(name: SoundName): void {
  if (isMuted()) return;

  try {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    switch (name) {
      case "correct":
        playCorrect(ctx);
        break;
      case "wrong":
        playWrong(ctx);
        break;
      case "reveal":
        playReveal(ctx);
        break;
      case "tick":
        playTick(ctx);
        break;
      case "celebration":
        playCelebration(ctx);
        break;
      case "streak":
        playStreak(ctx);
        break;
    }
  } catch {
    // Audio failed silently — not critical
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  delay = 0
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

/** Correct: ascending two-tone chime */
function playCorrect(ctx: AudioContext): void {
  playTone(ctx, 523, 0.12, "sine", 0.15, 0); // C5
  playTone(ctx, 784, 0.2, "sine", 0.12, 0.1); // G5
}

/** Wrong: descending buzz */
function playWrong(ctx: AudioContext): void {
  playTone(ctx, 300, 0.15, "square", 0.08, 0);
  playTone(ctx, 220, 0.25, "square", 0.06, 0.1);
}

/** Reveal: dramatic whoosh-ding */
function playReveal(ctx: AudioContext): void {
  playTone(ctx, 330, 0.1, "sine", 0.1, 0);
  playTone(ctx, 440, 0.1, "sine", 0.1, 0.08);
  playTone(ctx, 660, 0.3, "triangle", 0.12, 0.16);
}

/** Tick: short click for timer */
function playTick(ctx: AudioContext): void {
  playTone(ctx, 800, 0.05, "sine", 0.08, 0);
}

/** Celebration: triumphant ascending arpeggio */
function playCelebration(ctx: AudioContext): void {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(ctx, freq, 0.2, "sine", 0.12, i * 0.1);
  });
}

/** Streak: quick power-up sweep */
function playStreak(ctx: AudioContext): void {
  playTone(ctx, 440, 0.08, "sawtooth", 0.06, 0);
  playTone(ctx, 660, 0.08, "sawtooth", 0.06, 0.06);
  playTone(ctx, 880, 0.15, "sine", 0.1, 0.12);
}
