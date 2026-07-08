import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/TaskRow.tsx", import.meta.url), "utf8");

test("TaskRow exposes note editing inside the task settings popover", () => {
  assert.match(source, /aria-label="Task note"/);
  assert.match(source, /name="task-settings-note"/);
  assert.doesNotMatch(source, /aria-label="Add task note"/);
});

test("TaskRow does not save an unchanged task note on blur", () => {
  assert.match(source, /trimmed === \(task\.note \?\? ""\)/);
});
