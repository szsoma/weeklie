import assert from "node:assert/strict";
import test from "node:test";
import { calculateReviewStreak } from "../src/lib/streak.ts";
import { getWeekStart } from "../src/dates.ts";

// getWeekStart("2026-08-12") === 2026-08-10, whose week id is 2026-W33.
// Preceding weeks are 2026-W32, 2026-W31, 2026-W30.
const augWeek = getWeekStart(new Date("2026-08-12T12:00:00"));

test("a first-ever review is a streak of 1", () => {
  assert.equal(calculateReviewStreak([], augWeek), 1);
});

test("counts consecutive preceding weeks", () => {
  assert.equal(calculateReviewStreak(["2026-W32", "2026-W31"], augWeek), 3);
});

test("stops at the first gap", () => {
  // W32 missing breaks the chain even though W31 and W30 exist.
  assert.equal(calculateReviewStreak(["2026-W31", "2026-W30"], augWeek), 1);
});

test("is not inflated by the current week already being present", () => {
  // Re-saving the same week must not double-count it.
  assert.equal(calculateReviewStreak(["2026-W33", "2026-W32"], augWeek), 2);
});

test("ignores unordered input", () => {
  assert.equal(calculateReviewStreak(["2026-W31", "2026-W32"], augWeek), 3);
});

test("crosses the ISO year boundary", () => {
  // getWeekStart("2025-12-31") === 2025-12-29, whose ISO week id is 2026-W01.
  // The preceding week (2025-12-22) is 2025-W52.
  const newYearWeek = getWeekStart(new Date("2025-12-31T12:00:00"));
  assert.equal(calculateReviewStreak(["2025-W52", "2025-W51"], newYearWeek), 3);
});

test("accepts a Set as well as an array", () => {
  assert.equal(calculateReviewStreak(new Set(["2026-W32"]), augWeek), 2);
});
