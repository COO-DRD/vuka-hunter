"use client";
import { createContext, useContext, useState } from "react";
import { IconMoon as Moon, IconSun as Sun } from "@tabler/icons-react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeContextValue>({ theme: "light", toggle: () => {} });

function safeGetStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (safeGetStorage("hunter-theme") as Theme) ?? "light";
  });

  const toggle = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      safeSetStorage("hunter-theme", next);
      return next;
    });
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div data-theme={theme} suppressHydrationWarning style={{ display: "contents" }}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeToggleMobile() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="md:hidden fixed bottom-20 right-3 z-50 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-colors"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark"
        ? <Sun className="h-3.5 w-3.5" />
        : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
