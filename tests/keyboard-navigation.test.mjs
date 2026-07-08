import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const keyboard = readFileSync(new URL("../src/lib/keyboard.ts", import.meta.url), "utf8");
const focusTrap = readFileSync(new URL("../src/hooks/useFocusTrap.ts", import.meta.url), "utf8");
const hook = readFileSync(new URL("../src/hooks/useGlobalShortcuts.ts", import.meta.url), "utf8");
const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");
const help = readFileSync(new URL("../src/components/KeyboardShortcutsDialog.tsx", import.meta.url), "utf8");
const quickDialog = readFileSync(new URL("../src/components/QuickCaptureDialog.tsx", import.meta.url), "utf8");

test("global shortcuts are ignored while typing", () => {
  assert.match(keyboard, /isEditableShortcutTarget/);
  assert.match(keyboard, /HTMLInputElement/);
  assert.match(keyboard, /HTMLTextAreaElement/);
  assert.match(keyboard, /isContentEditable/);
});

test("global shortcut hook maps required keys", () => {
  assert.match(hook, /metaKey \|\| event\.ctrlKey/);
  assert.match(hook, /event\.key\.toLowerCase\(\) === "k"/);
  assert.match(hook, /event\.key === "\/"/);
  assert.match(hook, /event\.key\.toLowerCase\(\) === "t"/);
  assert.match(hook, /event\.key\.toLowerCase\(\) === "n"/);
  assert.match(hook, /event\.key === "\?"/);
});

test("store tracks focused keyboard targets", () => {
  assert.match(store, /focusedColumnId/);
  assert.match(store, /focusedTaskId/);
  assert.match(store, /todayFocusActive/);
  assert.match(store, /toggleTodayFocus/);
  assert.match(store, /backlogSearchFocused/);
  assert.match(store, /setFocusedColumn/);
  assert.match(store, /setFocusedTask/);
  assert.match(store, /moveFocusedTask/);
});

test("dialogs trap focus while open", () => {
  assert.match(focusTrap, /useFocusTrap/);
  assert.match(focusTrap, /querySelectorAll/);
  assert.match(focusTrap, /event\.key !== "Tab"/);
  assert.match(help, /useFocusTrap/);
  assert.match(quickDialog, /useFocusTrap/);
});

test("keyboard help dialog documents user-facing shortcuts", () => {
  assert.match(help, /Keyboard shortcuts/);
  assert.match(help, /Quick capture/);
  assert.match(help, /Focus backlog/);
  assert.match(help, /Toggle today/);
  assert.match(help, /Move task/);
});
