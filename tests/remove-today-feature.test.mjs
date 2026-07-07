import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const weekHeaderSource = readFileSync(
  new URL("../src/components/WeekHeader.tsx", import.meta.url),
  "utf8",
);
const floatingNavSource = readFileSync(
  new URL("../src/components/FloatingNav.tsx", import.meta.url),
  "utf8",
);
const featuresSource = readFileSync(
  new URL("../src/components/FeaturesScreen.tsx", import.meta.url),
  "utf8",
);
const weekGridSource = readFileSync(
  new URL("../src/components/WeekGrid.tsx", import.meta.url),
  "utf8",
);

test("App no longer wires Today Focus state into main surfaces", () => {
  assert.doesNotMatch(appSource, /useTodayFocus/);
  assert.doesNotMatch(appSource, /todayFocusState/);
  assert.doesNotMatch(appSource, /todayFocus=/);
  assert.doesNotMatch(appSource, /onToggleTodayFocus=/);
  assert.doesNotMatch(appSource, /canFocusToday=/);
});

test("WeekHeader no longer exposes Today actions", () => {
  assert.doesNotMatch(weekHeaderSource, /TodayFocusButton/);
  assert.doesNotMatch(weekHeaderSource, /todayFocus/);
  assert.doesNotMatch(weekHeaderSource, /onToggleTodayFocus/);
  assert.doesNotMatch(weekHeaderSource, /Jump to today/);
  assert.doesNotMatch(weekHeaderSource, />Today</);
  assert.doesNotMatch(weekHeaderSource, /Today focus/);
});

test("FloatingNav no longer exposes the Today Focus button", () => {
  assert.doesNotMatch(floatingNavSource, /TodayFocusButton/);
  assert.doesNotMatch(floatingNavSource, /todayFocus/);
  assert.doesNotMatch(floatingNavSource, /onToggleTodayFocus/);
  assert.doesNotMatch(floatingNavSource, /canFocusToday/);
});

test("Features list no longer advertises Today Focus", () => {
  assert.doesNotMatch(featuresSource, /Today focus/);
});

test("WeekGrid always renders the full week grid", () => {
  assert.doesNotMatch(weekGridSource, /todayFocus/);
  assert.doesNotMatch(weekGridSource, /md:max-w-\[28rem\]/);
});
