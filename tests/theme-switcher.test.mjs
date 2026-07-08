import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readOptional(url) {
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

const floatingNavSource = readFileSync(
  new URL("../src/components/FloatingNav.tsx", import.meta.url),
  "utf8",
);
const cssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);
const themeHookSource = readOptional(
  new URL("../src/hooks/useTheme.ts", import.meta.url),
);

test("FloatingNav exposes System, Light, and Dark theme options", () => {
  assert.match(floatingNavSource, /Theme/);
  assert.match(floatingNavSource, /System/);
  assert.match(floatingNavSource, /Light/);
  assert.match(floatingNavSource, /Dark/);
  assert.match(floatingNavSource, /aria-label=\{`Set theme to \$\{option\.label\}`\}/);
});

test("theme CSS supports explicit light and dark overrides", () => {
  assert.match(cssSource, /:root\[data-theme="light"\]/);
  assert.match(cssSource, /:root\[data-theme="dark"\]/);
  assert.match(cssSource, /--bg: #fffdf3/);
  assert.match(cssSource, /--bg: #1a1a1a/);
});

test("useTheme persists the local theme preference and applies document override", () => {
  assert.match(themeHookSource, /THEME_STORAGE_KEY = "weeklie\.theme"/);
  assert.match(themeHookSource, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(themeHookSource, /delete document\.documentElement\.dataset\.theme/);
  assert.match(themeHookSource, /localStorage\?\.setItem\(THEME_STORAGE_KEY, theme\)/);
});
