const THEME_KEY = "prefs:theme";

export type ThemeMode = "light" | "dark";

export function getTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return t === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function toggleTheme(): ThemeMode {
  const current = getTheme();
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function applyTheme(mode?: ThemeMode) {
  const m = mode ?? getTheme();
  const root = document.documentElement;
  console.log(`[applyTheme] Applying theme: ${m}`);
  if (m === "dark") {
    root.classList.add("dark");
    console.log("[applyTheme] Added 'dark' class.");
  } else {
    root.classList.remove("dark");
    console.log("[applyTheme] Removed 'dark' class.");
  }
}