import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { themePrefAtom, ThemePreference } from "@/state/atoms";

export function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [themePref, setThemePref] = useAtom(themePrefAtom);
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(getSystemTheme);

  // Lắng nghe thay đổi chế độ sáng/tối từ hệ thống thiết bị theo thời gian thực
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mql.matches ? "dark" : "light");

    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    if ((mql as any).addListener) {
      (mql as any).addListener(handler);
      return () => (mql as any).removeListener(handler);
    }
    return undefined;
  }, []);

  const resolvedTheme: "dark" | "light" =
    themePref === "system" ? systemTheme : themePref;

  // Cập nhật DOM class và thuộc tính
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(`theme-${resolvedTheme}`);
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return {
    theme: resolvedTheme,
    themePref,
    setThemePref,
    systemTheme,
  };
}
