/**
 * Haptic feedback utility for mobile game interactions.
 * Uses the Vibration API — silently no-ops on unsupported devices.
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Light tap — button press, selection */
export function hapticTap(): void {
  vibrate(10);
}

/** Medium — correct answer, assignment */
export function hapticSuccess(): void {
  vibrate([10, 50, 20]);
}

/** Heavy — wrong answer */
export function hapticError(): void {
  vibrate([30, 50, 30]);
}

/** Celebration — winner reveal, confetti */
export function hapticCelebration(): void {
  vibrate([20, 40, 20, 40, 60]);
}
