"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
const themeStorageKey = "malviz-theme";
const themeChangeEvent = "malviz-theme-change";

function browserTheme(): Theme {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function serverTheme(): Theme {
  return "light";
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChanges, browserTheme, serverTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(themeStorageKey, next);
    window.dispatchEvent(new Event(themeChangeEvent));
  }


  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="border-(--app-border) bg-(--app-surface) text-(--app-fg) hover:bg-(--app-surface-muted)"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
