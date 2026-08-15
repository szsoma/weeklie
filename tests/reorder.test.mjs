import assert from "node:assert/strict";
import test from "node:test";
import { computeOrderAtIndex, computeDropOrder } from "../src/lib/reorder.ts";

test("computeOrderAtIndex: empty column starts at 1", () => {
  assert.equal(computeOrderAtIndex([], 0), 1);
});

test("computeOrderAtIndex: dropping at the top goes before the first order", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 0), 9);
});

test("computeOrderAtIndex: dropping at the end goes after the last order", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 3), 31);
});

test("computeOrderAtIndex: dropping in the middle splits the neighbours", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 1), 15);
  assert.equal(computeOrderAtIndex([10, 20, 30], 2), 25);
});

test("computeOrderAtIndex: out-of-range indices clamp instead of returning NaN", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 99), 31);
  assert.equal(computeOrderAtIndex([10, 20, 30], -5), 9);
});

const column = [
  { id: "a", order: 10 },
  { id: "b", order: 20 },
  { id: "c", order: 30 },
];

test("computeDropOrder: dragging upward lands above the hovered task", () => {
  // c (last) dropped onto b → between a and b
  assert.equal(computeDropOrder(column, "c", "b"), 15);
});

test("computeDropOrder: dragging downward lands below the hovered task", () => {
  // a (first) dropped onto b → between b and c
  assert.equal(computeDropOrder(column, "a", "b"), 25);
});

test("computeDropOrder: dropping on the column background appends to the end", () => {
  assert.equal(computeDropOrder(column, "a", null), 31);
});

test("computeDropOrder: moving into a different column inserts above the hovered task", () => {
  // "z" is not currently in this column, so there is no drag direction to infer.
  assert.equal(computeDropOrder(column, "z", "b"), 15);
});

test("computeDropOrder: dropping into an empty column yields 1", () => {
  assert.equal(computeDropOrder([], "a", null), 1);
});

test("computeDropOrder: an unknown hovered id falls back to appending", () => {
  assert.equal(computeDropOrder(column, "a", "nope"), 31);
});
