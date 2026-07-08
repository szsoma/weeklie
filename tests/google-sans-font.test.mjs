import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("Google Sans is loaded from Google Fonts", () => {
  assert.match(indexSource, /fonts\.googleapis\.com\/css2\?family=Google\+Sans/);
  assert.doesNotMatch(indexSource, /geist/i);
});

test("body and mono utility both resolve to Google Sans", () => {
  assert.match(cssSource, /body\s*{[\s\S]*"Google Sans"/);
  assert.match(cssSource, /\.font-mono\s*{[\s\S]*"Google Sans"/);
  assert.doesNotMatch(cssSource, /"Geist Mono"/);
});
