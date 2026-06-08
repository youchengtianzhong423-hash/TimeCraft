"use client";

import { useEffect } from "react";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";

export function ThemeProvider() {
  const theme = useTimeCraftStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme ?? "maybe");
  }, [theme]);

  return null;
}
