import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");
const insights = readFileSync(new URL("../src/lib/week-insights.ts", import.meta.url), "utf8");
const button = readFileSync(new URL("../src/components/DayCheckinButton.tsx", import.meta.url), "utf8");
const dayColumn = readFileSync(new URL("../src/components/DayColumn.tsx", import.meta.url), "utf8");

test("store loads and upserts day check-ins", () => {
  assert.match(store, /dayCheckins/);
  assert.match(store, /loadDayCheckinsForWeek/);
  assert.match(store, /upsertDayCheckin/);
  assert.match(store, /\.from\('day_checkins'\)/);
  assert.match(store, /onConflict: 'user_id,date'/);
});

test("week insights summarize check-ins", () => {
  assert.match(insights, /summarizeDayCheckins/);
  assert.match(insights, /averageEnergy/);
  assert.match(insights, /mostCommonMood/);
  assert.match(insights, /bestEnergyDay/);
  assert.match(insights, /lowestEnergyDay/);
  assert.match(insights, /energyCompletionInsight/);
});

test("day check-in UI supports energy mood and note saves", () => {
  assert.match(button, /Energy/);
  assert.match(button, /Mood/);
  assert.match(button, /Calm/);
  assert.match(button, /Focused/);
  assert.match(button, /Scattered/);
  assert.match(button, /onBlur=\{saveNote\}/);
  assert.match(button, /event\.key === "Escape"/);
});

test("day columns render the day check-in control near the heading", () => {
  assert.match(dayColumn, /<DayCheckinButton/);
});

const review = readFileSync(new URL("../src/components/ReviewScreen.tsx", import.meta.url), "utf8");

test("weekly review renders daily rhythm insights", () => {
  assert.match(review, /Daily rhythm/);
  assert.match(review, /averageEnergy/);
  assert.match(review, /mostCommonMood/);
  assert.match(review, /bestEnergyDay/);
  assert.match(review, /lowestEnergyDay/);
});
