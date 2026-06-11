"use client";

import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";

export function UndoRedoToolbar() {
  const canUndo = useTimeCraftStore((s) => s.canUndo);
  const canRedo = useTimeCraftStore((s) => s.canRedo);
  const undo = useTimeCraftStore((s) => s.undo);
  const redo = useTimeCraftStore((s) => s.redo);

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={!canUndo}
        onClick={() => undo()}
        title="元に戻す（Ctrl+Z）"
        aria-label="元に戻す"
      >
        <Undo2 size={15} />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={!canRedo}
        onClick={() => redo()}
        title="やり直す（Ctrl+Y / Ctrl+Shift+Z）"
        aria-label="やり直す"
      >
        <Redo2 size={15} />
      </Button>
    </div>
  );
}
