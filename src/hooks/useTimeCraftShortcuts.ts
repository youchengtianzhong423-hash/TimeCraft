"use client";

import { useEffect } from "react";
import { isModalOpen, isTypingTarget } from "@/lib/scheduleSelection";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";

/** スケジュール画面向けのグローバルショートカット */
export function useTimeCraftShortcuts(options?: {
  onEscape?: () => void;
  enableDelete?: boolean;
}) {
  const undo = useTimeCraftStore((s) => s.undo);
  const redo = useTimeCraftStore((s) => s.redo);
  const canUndo = useTimeCraftStore((s) => s.canUndo);
  const canRedo = useTimeCraftStore((s) => s.canRedo);
  const selectedBoxId = useTimeCraftStore((s) => s.selectedBoxId);
  const removeBox = useTimeCraftStore((s) => s.removeBox);
  const setSelectedBoxId = useTimeCraftStore((s) => s.setSelectedBoxId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (isModalOpen()) return;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      if (
        (mod && e.key.toLowerCase() === "y") ||
        (mod && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      if (
        options?.enableDelete !== false &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedBoxId
      ) {
        e.preventDefault();
        removeBox(selectedBoxId);
        setSelectedBoxId(null);
        return;
      }

      if (e.key === "Escape") {
        if (selectedBoxId) {
          setSelectedBoxId(null);
          return;
        }
        options?.onEscape?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    options,
    redo,
    removeBox,
    selectedBoxId,
    setSelectedBoxId,
    undo,
  ]);
}
