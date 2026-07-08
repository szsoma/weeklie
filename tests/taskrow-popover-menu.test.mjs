import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/TaskRow.tsx", import.meta.url), "utf8");

test("TaskRow uses the native popover primitive for task settings", () => {
  assert.match(source, /createPortal\(/);
  assert.match(source, /document\.body/);
  assert.match(source, /popoverTarget=\{settingsPopoverId\}/);
  assert.match(source, /popover="auto"/);
  assert.match(source, /popoverTargetAction="hide"/);
  assert.doesNotMatch(source, /getBoundingClientRect/);
});

test("Task settings changes keep the popover open for continued editing", () => {
  assert.match(source, /aria-label="Task note"/);
  assert.doesNotMatch(source, /selectRecurrence[\s\S]*?closeSettingsPopover\(\);[\s\S]*?\[closeSettingsPopover, task\.id, updateTask\]/);
  assert.doesNotMatch(source, /selectDueTime[\s\S]*?closeSettingsPopover\(\);[\s\S]*?\[closeSettingsPopover, task\.id, updateTask\]/);
  assert.doesNotMatch(source, /handleNoteEdit[\s\S]*?closeSettingsPopover\(\);/);
});
