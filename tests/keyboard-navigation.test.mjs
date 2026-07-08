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

const dayColumn = readFileSync(new URL("../src/components/DayColumn.tsx", import.meta.url), "utf8");
const weekGrid = readFileSync(new URL("../src/components/WeekGrid.tsx", import.meta.url), "utf8");
const backlog = readFileSync(new URL("../src/components/BacklogPanel.tsx", import.meta.url), "utf8");
const newTaskLine = readFileSync(new URL("../src/components/NewTaskLine.tsx", import.meta.url), "utf8");
const taskRow = readFileSync(new URL("../src/components/TaskRow.tsx", import.meta.url), "utf8");

test("columns and new task inputs expose focus targets", () => {
  assert.match(dayColumn, /tabIndex=\{0\}/);
  assert.match(dayColumn, /data-column-id/);
  assert.match(dayColumn, /setFocusedColumn/);
  assert.match(dayColumn, /event\.target !== event\.currentTarget/);
  assert.match(dayColumn, /event\.key === "ArrowLeft"/);
  assert.match(dayColumn, /event\.key === "ArrowRight"/);
  assert.match(dayColumn, /event\.key === "ArrowDown"/);
  assert.match(backlog, /setFocusedColumn\("backlog"\)/);
  assert.match(backlog, /onKeyDown/);
  assert.match(backlog, /data-new-task-column="backlog"/);
  assert.match(newTaskLine, /data-new-task-column/);
  assert.match(weekGrid, /todayFocusActive/);
});

test("task rows expose keyboard task actions", () => {
  assert.match(taskRow, /tabIndex=\{0\}/);
  assert.match(taskRow, /data-task-id/);
  assert.match(taskRow, /setFocusedTask/);
  assert.match(taskRow, /event\.key === " "/);
  assert.match(taskRow, /event\.key === "Enter"/);
  assert.match(taskRow, /event\.key === "Backspace"/);
  assert.match(taskRow, /window\.confirm/);
  assert.match(taskRow, /event\.key === "ArrowUp"/);
  assert.match(taskRow, /event\.key === "ArrowDown"/);
  assert.match(taskRow, /event\.key === "ArrowLeft"/);
  assert.match(taskRow, /event\.key === "ArrowRight"/);
  assert.match(taskRow, /event\.shiftKey && event\.key === "ArrowLeft"/);
  assert.match(taskRow, /event\.shiftKey && event\.key === "ArrowRight"/);
  assert.match(taskRow, /event\.stopPropagation\(\)/);
});
