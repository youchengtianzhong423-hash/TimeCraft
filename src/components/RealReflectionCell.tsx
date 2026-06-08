"use client";

import type { Box } from "@/lib/types";
import {
  normalizeReflectionText,
  reflectionCellKey,
} from "@/lib/reflectionCell";
import { useTimeCraftStore, useWeekPlanner } from "@/store/useTimeCraftStore";
import { cn } from "@/lib/cn";

interface Props {
  dateIso: string;
  blockStart: string;
  blockEnd: string;
  anchorDate: Date;
  completedInBlock: Box[];
  className?: string;
}

export function RealReflectionCell({
  dateIso,
  blockStart,
  blockEnd,
  anchorDate,
  completedInBlock,
  className,
}: Props) {
  const cellKey = reflectionCellKey(dateIso, blockStart, blockEnd);
  const planner = useWeekPlanner(anchorDate);
  const setRealReflection = useTimeCraftStore((s) => s.setRealReflection);
  const value = normalizeReflectionText(
    planner.realReflection[cellKey] ?? "",
  );

  return (
    <div
      className={cn(
        "h-full min-h-0 flex flex-col gap-0.5 p-0.5 pointer-events-auto",
        className,
      )}
    >
      {completedInBlock.length > 0 && (
        <ul className="shrink-0 space-y-0.5 max-h-[40%] overflow-hidden">
          {completedInBlock.map((b) => (
            <li
              key={b.id}
              className="text-[8px] leading-tight text-emerald-800 truncate rounded border border-emerald-200/80 bg-emerald-50/90 px-0.5"
              title={b.title}
            >
              {b.title}
            </li>
          ))}
        </ul>
      )}
      <textarea
        aria-label="時間帯のメモ"
        value={value}
        onChange={(e) =>
          setRealReflection(cellKey, e.target.value, anchorDate)
        }
        className={cn(
          "flex-1 min-h-[1.25rem] w-full resize-none rounded border border-emerald-200/70",
          "bg-white/80 px-1 py-0.5 text-[9px] leading-snug text-slate-800",
          "focus:outline-none focus:ring-1 focus:ring-emerald-300",
          "[&::placeholder]:opacity-0",
        )}
      />
    </div>
  );
}
