"use client";

import {
  Check,
  CircleDashed,
  ClockArrowDown,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { Box } from "@/lib/types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  compact?: boolean;
}

export function BoxActions({ box, compact }: Props) {
  const setStatus = useTimeCraftStore((s) => s.setBoxStatus);
  const completeBox = useTimeCraftStore((s) => s.completeBox);

  const handleComplete = () => {
    completeBox(box.id, {
      asPlanned: true,
      focused: null,
    });
  };

  const baseBtn = cn(
    "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    compact ? "px-1.5 py-1 text-[11px]" : "px-2 py-1 text-xs",
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {box.status === "notStarted" && (
        <button
          className={cn(baseBtn, "text-emerald-700 border-emerald-200")}
          onClick={() => setStatus(box.id, "inProgress")}
        >
          <Play size={12} />
          開始
        </button>
      )}
      {box.status === "inProgress" && (
        <>
          <button
            className={cn(baseBtn, "text-amber-700 border-amber-200")}
            onClick={() => setStatus(box.id, "paused")}
          >
            <Pause size={12} />
            一時停止
          </button>
          <button
            className={cn(baseBtn, "text-indigo-700 border-indigo-200")}
            onClick={handleComplete}
          >
            <Check size={12} />
            完了
          </button>
        </>
      )}
      {box.status === "paused" && (
        <>
          <button
            className={cn(baseBtn, "text-emerald-700 border-emerald-200")}
            onClick={() => setStatus(box.id, "inProgress")}
          >
            <Play size={12} />
            再開
          </button>
          <button
            className={cn(baseBtn, "text-indigo-700 border-indigo-200")}
            onClick={handleComplete}
          >
            <Check size={12} />
            完了
          </button>
        </>
      )}
      {box.status === "completed" && (
        <button
          className={baseBtn}
          onClick={() => setStatus(box.id, "notStarted")}
        >
          <RotateCcw size={12} />
          取消
        </button>
      )}
      {box.status !== "completed" && box.status !== "postponed" && (
        <button
          className={baseBtn}
          onClick={() => setStatus(box.id, "postponed")}
          title="延期"
        >
          <ClockArrowDown size={12} />
          延期
        </button>
      )}
      {box.status === "postponed" && (
        <button
          className={baseBtn}
          onClick={() => setStatus(box.id, "notStarted")}
        >
          <CircleDashed size={12} />
          未開始に戻す
        </button>
      )}
    </div>
  );
}
