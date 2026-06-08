"use client";

import { useCallback, useRef } from "react";
import type { Box } from "@/lib/types";
import { DraggableBoxItem } from "./DraggableBoxItem";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import {
  minutesToHHmm,
  snapScheduleMinutes,
  toMinutes,
} from "@/lib/timeBlocks";
import { durationMinutes } from "@/lib/timeBlocks";
import { scheduleDisplayDensity } from "@/lib/scheduleDisplay";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  /** タイムライン先頭（分）。週間グリッドは 5:00 始まり */
  timelineStartMin: number;
  timelineDurMin: number;
  style: React.CSSProperties;
}

const MIN_DURATION_MIN = 15;

export function VisionScheduleBox({
  box,
  timelineStartMin,
  timelineDurMin,
  style,
}: Props) {
  const resizeBoxEndTime = useTimeCraftStore((s) => s.resizeBoxEndTime);
  const resizeBoxStartTime = useTimeCraftStore((s) => s.resizeBoxStartTime);
  const cellRef = useRef<HTMLDivElement>(null);
  const durMin = Math.max(
    MIN_DURATION_MIN,
    durationMinutes(box.startTime, box.endTime),
  );
  const scheduleDensity = scheduleDisplayDensity(durMin);

  const onResizeEndPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const cell = cellRef.current?.parentElement;
      if (!cell) return;

      const startY = e.clientY;
      const startEndMin = toMinutes(box.endTime);
      const startMin = toMinutes(box.startTime);

      const onMove = (ev: PointerEvent) => {
        const rect = cell.getBoundingClientRect();
        const deltaMin = ((ev.clientY - startY) / rect.height) * timelineDurMin;
        let nextEnd = snapScheduleMinutes(startEndMin + deltaMin);
        nextEnd = Math.max(
          startMin + MIN_DURATION_MIN,
          Math.min(timelineStartMin + timelineDurMin, nextEnd),
        );
        resizeBoxEndTime(box.id, minutesToHHmm(nextEnd));
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [timelineDurMin, box.endTime, box.id, box.startTime, resizeBoxEndTime],
  );

  const onResizeStartPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const cell = cellRef.current?.parentElement;
      if (!cell) return;

      const startY = e.clientY;
      const startStartMin = toMinutes(box.startTime);
      const endMin = toMinutes(box.endTime);

      const onMove = (ev: PointerEvent) => {
        const rect = cell.getBoundingClientRect();
        const deltaMin = ((ev.clientY - startY) / rect.height) * timelineDurMin;
        let nextStart = snapScheduleMinutes(startStartMin + deltaMin);
        nextStart = Math.max(
          timelineStartMin,
          Math.min(endMin - MIN_DURATION_MIN, nextStart),
        );
        resizeBoxStartTime(box.id, minutesToHHmm(nextStart));
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [timelineDurMin, box.startTime, box.id, box.endTime, resizeBoxStartTime],
  );

  return (
    <div
      ref={cellRef}
      className="absolute group/vision pointer-events-auto"
      style={style}
    >
      <DraggableBoxItem
        box={box}
        dragId={`box|${box.id}`}
        origin={{
          kind: "grid",
          date: box.date,
          startTime: box.startTime,
          endTime: box.endTime,
        }}
        compact
        fillHeight
        readOnly
        scheduleDensity={scheduleDensity}
        dragHandleOnly={false}
      />
      <div
        role="separator"
        aria-label="開始時刻を調整"
        onPointerDown={onResizeStartPointerDown}
        className={cn(
          "absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20",
          "opacity-0 group-hover/vision:opacity-100",
          "bg-indigo-400/40 hover:bg-indigo-500/60 rounded-t-md",
        )}
      />
      <div
        role="separator"
        aria-label="終了時刻を調整"
        onPointerDown={onResizeEndPointerDown}
        className={cn(
          "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20",
          "opacity-0 group-hover/vision:opacity-100",
          "bg-indigo-400/40 hover:bg-indigo-500/60 rounded-b-md",
        )}
      />
    </div>
  );
}
