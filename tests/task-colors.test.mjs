import assert from "node:assert/strict";
import test from "node:test";
import {
  TASK_COLOR_TOKENS,
  TASK_COLOR_HEX,
  getTaskColorHex,
} from "../src/lib/task-colors.ts";

test("exposes exactly the four supported tokens", () => {
  assert.deepEqual([...TASK_COLOR_TOKENS], ["red", "orange", "yellow", "green"]);
});

test("every token maps to a real 6-digit hex value", () => {
  for (const token of TASK_COLOR_TOKENS) {
    assert.match(
      TASK_COLOR_HEX[token],
      /^#[0-9a-f]{6}$/i,
      `${token} must map to a hex colour, got ${TASK_COLOR_HEX[token]}`,
    );
  }
});

test("no token maps to a bare Tailwind class name", () => {
  // Regression guard for the original bug: bg-red / bg-green are not real
  // Tailwind v4 utilities and rendered as invisible swatches.
  for (const token of TASK_COLOR_TOKENS) {
    assert.doesNotMatch(TASK_COLOR_HEX[token], /^bg-/);
  }
});

test("pins the exact hex values so colours cannot drift silently", () => {
  assert.deepEqual(TASK_COLOR_HEX, {
    red: "#e74c3c",
    orange: "#e67e22",
    yellow: "#eab308",
    green: "#22c55e",
  });
});

test("getTaskColorHex resolves known tokens and rejects everything else", () => {
  assert.equal(getTaskColorHex("green"), "#22c55e");
  assert.equal(getTaskColorHex(null), null);
  assert.equal(getTaskColorHex("purple"), null);
  assert.equal(getTaskColorHex(""), null);
});
