import assert from "node:assert/strict";
import test from "node:test";
import { getTaskIdToComplete } from "../src/lib/notifications.ts";

test("completes the task when the mark-done action button is used", () => {
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123", action: "mark-done" }),
    "abc123",
  );
});

test("does NOT complete the task when the notification body is tapped", () => {
  // Browsers report action as "" for a plain body tap. This is the bug.
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123", action: "" }),
    null,
  );
});

test("does NOT complete the task when action is absent", () => {
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123" }),
    null,
  );
});

test("ignores messages of a different type", () => {
  assert.equal(
    getTaskIdToComplete({ type: "workbox-broadcast-update", taskId: "abc123", action: "mark-done" }),
    null,
  );
});

test("ignores a mark-done action with no task id", () => {
  assert.equal(getTaskIdToComplete({ type: "weeklie:mark-done", action: "mark-done" }), null);
});

test("tolerates malformed payloads without throwing", () => {
  assert.equal(getTaskIdToComplete(null), null);
  assert.equal(getTaskIdToComplete(undefined), null);
  assert.equal(getTaskIdToComplete("nope"), null);
  assert.equal(getTaskIdToComplete(42), null);
  assert.equal(getTaskIdToComplete({ type: "weeklie:mark-done", taskId: 7, action: "mark-done" }), null);
});
