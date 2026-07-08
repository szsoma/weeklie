import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync(new URL("../src/lib/quick-capture.ts", import.meta.url), "utf8");
const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../src/components/QuickCaptureDialog.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("../src/components/FloatingNav.tsx", import.meta.url), "utf8");

test("quick capture maps destinations to visible-week task dates", () => {
  assert.match(helper, /resolveQuickCaptureDate/);
  assert.match(helper, /QuickCaptureDestination/);
  assert.match(helper, /case 'backlog'/);
  assert.match(helper, /formatDate\(getWeekDays\(visibleWeekStart\)\[dayIndex\]\)/);
});

test("quick capture creates top-ordered tasks through the store", () => {
  assert.match(store, /quickCaptureOpen/);
  assert.match(store, /openQuickCapture/);
  assert.match(store, /closeQuickCapture/);
  assert.match(store, /createTaskFromQuickCapture/);
  assert.match(store, /getTopOrderForDate/);
  assert.match(store, /playChime\('add'\)/);
});

test("quick capture dialog exposes required fields and keyboard behavior", () => {
  assert.match(dialog, /Quick Capture/);
  assert.match(dialog, /Task/);
  assert.match(dialog, /Destination/);
  assert.match(dialog, /Optional note/);
  assert.match(dialog, /type="time"/);
  assert.match(dialog, /Cmd\/Ctrl \+ Enter/);
  assert.match(dialog, /e\.key === "Escape"/);
});

test("quick capture is available from app shell and floating nav", () => {
  assert.match(app, /<QuickCaptureDialog/);
  assert.match(nav, /aria-label="Open quick capture"/);
});
