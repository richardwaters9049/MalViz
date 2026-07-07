"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [state, setState] = useState<{ theme: Theme; mounted: boolean }>({ theme: "light", mounted: false });

  useEffect(() => {
    // Initialize theme from localStorage on mount
    // Note: localStorage doesn't have a subscription mechanism, so we must read it once on mount
    // This is the correct pattern for syncing external systems that don't support subscriptions
    const stored = localStorage.getItem("malviz-theme");
    const initialTheme = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    // eslint-disable-next-line
    setState({ theme: initialTheme, mounted: true });
  }, []);

  useEffect(() => {
    // Sync theme changes to DOM
    if (state.mounted) {
      document.documentElement.dataset.theme = state.theme;
    }
  }, [state.theme, state.mounted]);

  if (!state.mounted) {
    return null;
  }

  function toggleTheme() {
    const next = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("malviz-theme", next);
    setState({ ...state, theme: next });
  }


  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${state.theme === "dark" ? "light" : "dark"} mode`}
      className="border-(--app-border) bg-(--app-surface) text-(--app-fg) hover:bg-(--app-surface-muted)"
    >
      {state.theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">{state.theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
