import { subWeeks } from 'date-fns'
import { getWeekId } from '../dates.ts'

/**
 * Consecutive-week review streak, counting the week currently being reviewed.
 *
 * Returns 1 when no preceding week has a review, then adds one for each
 * unbroken preceding week found in `reviewedWeekIds`.
 */
export function calculateReviewStreak(
  reviewedWeekIds: Iterable<string>,
  currentWeekStart: Date,
): number {
  const reviewed = new Set(reviewedWeekIds)
  let streak = 1
  let cursor = subWeeks(currentWeekStart, 1)

  while (reviewed.has(getWeekId(cursor))) {
    streak += 1
    cursor = subWeeks(cursor, 1)
  }

  return streak
}
