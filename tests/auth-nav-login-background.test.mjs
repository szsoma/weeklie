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

test("App owns logout and passes authenticated nav props", () => {
  assert.match(appSource, /const handleLogout = async \(\) => \{/);
  assert.match(appSource, /supabase\.auth\.signOut\(\)/);
  assert.match(appSource, /isAuthenticated=\{Boolean\(session\)\}/);
  assert.match(appSource, /onLogout=\{handleLogout\}/);
});

test("FloatingNav swaps login and signup for logout when authenticated", () => {
  assert.match(floatingNavSource, /isAuthenticated\?: boolean/);
  assert.match(floatingNavSource, /onLogout\?: \(\) => void/);
  assert.match(
    floatingNavSource,
    /isAuthenticated \? \([\s\S]*>\s*Logout\s*<[\s\S]*\) : \([\s\S]*href="#login"[\s\S]*href="#signup"/,
  );
  assert.match(floatingNavSource, /onLogout\?\.\(\)/);
  assert.doesNotMatch(floatingNavSource, /!\s*isAuthenticated && \(/);
});

test("SiteHeader supports the same authenticated auth actions", () => {
  assert.match(siteHeaderSource, /isAuthenticated\?: boolean/);
  assert.match(siteHeaderSource, /onLogout\?: \(\) => void/);
  assert.match(
    siteHeaderSource,
    /isAuthenticated \? \([\s\S]*>\s*Logout\s*<[\s\S]*\) : \([\s\S]*href="#login"[\s\S]*href="#signup"/,
  );
  assert.match(siteHeaderSource, /onLogout\?\.\(\)/);
  assert.doesNotMatch(siteHeaderSource, /!\s*isAuthenticated && \(/);
});

test("AuthScreen uses the supplied full-screen image and blurred white panel", () => {
  assert.match(authScreenSource, /url\('\/hero-bg-p-2600\.jpg'\)/);
  assert.match(authScreenSource, /bg-cover/);
  assert.match(authScreenSource, /bg-center/);
  assert.match(authScreenSource, /bg-white\/80/);
  assert.match(authScreenSource, /backdrop-blur/);
});
