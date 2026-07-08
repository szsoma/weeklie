import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");
const insights = readFileSync(new URL("../src/lib/week-insights.ts", import.meta.url), "utf8");
const tracker = readFileSync(new URL("../src/components/HabitTracker.tsx", import.meta.url), "utf8");
const row = readFileSync(new URL("../src/components/HabitRow.tsx", import.meta.url), "utf8");
const addInput = readFileSync(new URL("../src/components/HabitAddInput.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const weekHeader = readFileSync(new URL("../src/components/WeekHeader.tsx", import.meta.url), "utf8");

test("store loads creates archives and toggles habits", () => {
  assert.match(store, /habits/);
  assert.match(store, /habitEntries/);
  assert.match(store, /loadHabitsForWeek/);
  assert.match(store, /loadHabitEntriesForWeek/);
  assert.match(store, /createHabit/);
  assert.match(store, /archiveHabit/);
  assert.match(store, /toggleHabitEntry/);
  assert.match(store, /\.from\('habits'\)/);
  assert.match(store, /\.from\('habit_entries'\)/);
  assert.match(store, /onConflict: 'habit_id,date'/);
});

test("habit insights summarize completion and consistency", () => {
  assert.match(insights, /summarizeHabits/);
  assert.match(insights, /bestHabit/);
  assert.match(insights, /lowestConsistencyHabit/);
});

test("habit UI supports creation toggling and archiving", () => {
  assert.match(tracker, /Habits/);
  assert.match(tracker, /<HabitAddInput/);
  assert.match(tracker, /useMemo/);
  assert.doesNotMatch(tracker, /useStore\(\(s\) => s\.habits\.filter/);
  assert.match(row, /toggleHabitEntry/);
  assert.match(row, /archiveHabit/);
  assert.match(row, /completedCount/);
  assert.match(row, /aria-expanded/);
  assert.match(row, /useMemo/);
  assert.doesNotMatch(row, /useStore\(\(s\) => s\.habitEntries\.filter/);
  assert.match(addInput, /Add habit/);
});

test("habit tracker is placed below the week header without the week intention bar", () => {
  assert.match(app, /<HabitTracker/);
  assert.doesNotMatch(weekHeader, /<WeekIntention/);
  assert.doesNotMatch(weekHeader, /This week I want to/);
});

const review = readFileSync(new URL("../src/components/ReviewScreen.tsx", import.meta.url), "utf8");

test("weekly review renders habit insights", () => {
  assert.match(review, /Habit rhythm/);
  assert.match(review, /bestHabit/);
  assert.match(review, /lowestConsistencyHabit/);
});
