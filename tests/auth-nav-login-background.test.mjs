import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const floatingNavSource = readFileSync(
  new URL("../src/components/FloatingNav.tsx", import.meta.url),
  "utf8",
);
const siteHeaderSource = readFileSync(
  new URL("../src/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const authScreenSource = readFileSync(
  new URL("../src/components/AuthScreen.tsx", import.meta.url),
  "utf8",
);

test("App lets this device forget its Supabase session", () => {
  assert.match(appSource, /const handleForgetDevice = async \(\) => \{/);
  assert.match(appSource, /supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
  assert.match(appSource, /onForgetDevice=\{handleForgetDevice\}/);
  assert.doesNotMatch(appSource, /onLogout|isAuthenticated=/);
});

test("FloatingNav offers a local device forget action without account links", () => {
  assert.match(floatingNavSource, /onForgetDevice\?: \(\) => void/);
  assert.match(floatingNavSource, /onForgetDevice\?\.\(\)/);
  assert.match(floatingNavSource, />\s*Forget this device\s*</);
  assert.doesNotMatch(floatingNavSource, /href="#login"|href="#signup"|>\s*Logout\s*</);
});

test("SiteHeader has no account links", () => {
  assert.doesNotMatch(siteHeaderSource, /href="#login"|href="#signup"|>\s*Logout\s*</);
});

test("AuthScreen uses the supplied full-screen image and blurred white panel", () => {
  assert.match(authScreenSource, /url\('\/hero-bg-p-2600\.jpg'\)/);
  assert.match(authScreenSource, /bg-cover/);
  assert.match(authScreenSource, /bg-center/);
  assert.match(authScreenSource, /bg-white\/80/);
  assert.match(authScreenSource, /backdrop-blur/);
});

test("AuthScreen pins light theme tokens on the white unlock panel", () => {
  assert.match(authScreenSource, /"--bg": "#fffdfc"/);
  assert.match(authScreenSource, /"--surface": "#fff"/);
  assert.match(authScreenSource, /"--ink": "#1a1a1a"/);
  assert.match(authScreenSource, /"--muted": "#514b3f"/);
  assert.match(authScreenSource, /"--faint": "#6f6657"/);
  assert.match(authScreenSource, /"--rule": "rgba\(26, 26, 26, 0\.12\)"/);
  assert.match(authScreenSource, /"--rule-strong": "rgba\(26, 26, 26, 0\.22\)"/);
  assert.match(authScreenSource, /as React\.CSSProperties/);
});
