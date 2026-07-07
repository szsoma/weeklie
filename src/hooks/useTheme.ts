import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "weeklie.theme";
const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    if (theme === "system") {
      try {
        globalThis.localStorage?.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Ignore storage failures.
      }
      delete document.documentElement.dataset.theme;
      return;
    }

    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { theme, setTheme };
}
