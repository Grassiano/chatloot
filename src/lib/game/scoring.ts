/** Base points for a correct answer */
const BASE_POINTS = 100;

/** Maximum speed bonus points */
const MAX_SPEED_BONUS = 50;

/** Streak bonus multiplier per consecutive correct answer */
const STREAK_MULTIPLIER = 10;

/**
 * Calculate score for a correct answer.
 * Faster answers get more points. Streaks add bonus.
 */
export function calculateScore(
  timeMs: number,
  timerSeconds: number,
  streak: number
): number {
  const maxTimeMs = timerSeconds * 1000;

  // Speed bonus: faster = more points (linear scale)
  const timeRatio = Math.max(0, 1 - timeMs / maxTimeMs);
  const speedBonus = Math.round(timeRatio * MAX_SPEED_BONUS);

  // Streak bonus: consecutive correct answers
  const streakBonus = Math.min(streak, 5) * STREAK_MULTIPLIER;

  return BASE_POINTS + speedBonus + streakBonus;
}
