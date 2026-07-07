import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import test from "node:test";

const componentFiles = globSync("src/components/**/*.{tsx,ts}");
const sources = componentFiles.map((file) => [file, readFileSync(file, "utf8")]);

test("input focus styles do not add active borders", () => {
  for (const [file, source] of sources) {
    assert.doesNotMatch(source, /focus:border-/, `${file} adds a focus border`);
  }
});
