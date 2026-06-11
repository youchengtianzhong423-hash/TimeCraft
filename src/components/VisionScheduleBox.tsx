"use client";

import { useCallback, useRef, useState } from "react";
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
import { datesForHorizontalDuplicate } from "@/lib/scheduleSelection";
import { useHorizontalDuplicatePreview } from "@/components/HorizontalDuplicatePreview";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  timelineStartMin: number;
  timelineDurMin: number;
  style: React.CSSProperties;
  weekDates: string[];
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  showHorizontalHandles?: boolean;
}

const MIN_DURATION_MIN = 15;

function resolveVisionDayFromPoint(x: number, y: number): string | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    const day = el.closest<HTMLElement>("[data-vision-day]");
    if (day?.dataset.visionDay) return day.dataset.visionDay;
  }
  return null;
}

export function VisionScheduleBox({
  box,
  timelineStartMin,
  timelineDurMin,
  style,
  weekDates,
  selected = false,
  onSelect,
  onEdit,
  showHorizontalHandles = true,
}: Props) {
  const resizeBoxEndTime = useTimeCraftStore((s) => s.resizeBoxEndTime);
  const resizeBoxStartTime = useTimeCraftStore((s) => s.resizeBoxStartTime);
  const duplicateBoxesToDates = useTimeCraftStore(
    (s) => s.duplicateBoxesToDates,
  );
  const cellRef = useRef<HTMLDivElement>(null);
  const [hPreviewDates, setHPreviewDates] = useState<string[]>([]);
  const { setPreview } = useHorizontalDuplicatePreview();

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
      let lastEnd = box.endTime;

      const onMove = (ev: PointerEvent) => {
        const rect = cell.getBoundingClientRect();
        const deltaMin = ((ev.clientY - startY) / rect.height) * timelineDurMin;
        let nextEnd = snapScheduleMinutes(startEndMin + deltaMin);
        nextEnd = Math.max(
          startMin + MIN_DURATION_MIN,
          Math.min(timelineStartMin + timelineDurMin, nextEnd),
        );
        lastEnd = minutesToHHmm(nextEnd);
        resizeBoxEndTime(box.id, lastEnd);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        resizeBoxEndTime(box.id, lastEnd, { record: true });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [
      timelineDurMin,
      box.endTime,
      box.id,
      box.startTime,
      resizeBoxEndTime,
      timelineStartMin,
    ],
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
      let lastStart = box.startTime;

      const onMove = (ev: PointerEvent) => {
        const rect = cell.getBoundingClientRect();
        const deltaMin = ((ev.clientY - startY) / rect.height) * timelineDurMin;
        let nextStart = snapScheduleMinutes(startStartMin + deltaMin);
        nextStart = Math.max(
          timelineStartMin,
          Math.min(endMin - MIN_DURATION_MIN, nextStart),
        );
        lastStart = minutesToHHmm(nextStart);
        resizeBoxStartTime(box.id, lastStart);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        resizeBoxStartTime(box.id, lastStart, { record: true });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [
      timelineDurMin,
      box.startTime,
      box.id,
      box.endTime,
      resizeBoxStartTime,
      timelineStartMin,
    ],
  );

  const onHorizontalDuplicatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (weekDates.length < 2) return;

      const syncPreview = (dates: string[]) => {
        setHPreviewDates(dates);
        if (dates.length === 0) {
          setPreview(null);
          return;
        }
        setPreview({
          sourceBox: {
            id: box.id,
            type: box.type,
            title: box.title,
            startTime: box.startTime,
            endTime: box.endTime,
            date: box.date,
          },
          targetDates: dates,
          timelineStartMin,
          timelineDurMin,
        });
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };

      const onMove = (ev: PointerEvent) => {
        const hoverDay = resolveVisionDayFromPoint(ev.clientX, ev.clientY);
        if (!hoverDay) {
          syncPreview([]);
          return;
        }
        syncPreview(
          datesForHorizontalDuplicate(weekDates, box.date, hoverDay),
        );
      };

      const onCancel = () => {
        cleanup();
        syncPreview([]);
      };

      const onUp = (ev: PointerEvent) => {
        cleanup();
        const hoverDay = resolveVisionDayFromPoint(ev.clientX, ev.clientY);
        syncPreview([]);
        if (!hoverDay) return;
        const targets = datesForHorizontalDuplicate(
          weekDates,
          box.date,
          hoverDay,
        );
        if (targets.length > 0) {
          duplicateBoxesToDates(box.id, targets);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [
      box,
      duplicateBoxesToDates,
      setPreview,
      timelineDurMin,
      timelineStartMin,
      weekDates,
    ],
  );

  return (
    <div
      ref={cellRef}
      data-schedule-box
      className={cn(
        "absolute group/vision pointer-events-auto rounded-md",
        selected && "ring-2 ring-indigo-500 ring-offset-1 shadow-md z-20",
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
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
      {hPreviewDates.length > 0 && (
        <div className="absolute -top-5 left-0 right-0 text-[9px] text-indigo-700 font-medium truncate pointer-events-none text-center">
          複製予定 {hPreviewDates.length}日
        </div>
      )}
      <div
        role="separator"
        aria-label="開始時刻を調整"
        title="下にドラッグして時間を変更"
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
        title="下にドラッグして時間を変更"
        onPointerDown={onResizeEndPointerDown}
        className={cn(
          "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20",
          "opacity-0 group-hover/vision:opacity-100",
          "bg-indigo-400/40 hover:bg-indigo-500/60 rounded-b-md",
        )}
      />
      {showHorizontalHandles && weekDates.length > 1 && (
        <>
          <div
            role="separator"
            aria-label="左へドラッグして別の日へ複製"
            title="横にドラッグして別の日へ複製"
            onPointerDown={onHorizontalDuplicatePointerDown}
            className={cn(
              "absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 cursor-ew-resize z-20",
              "opacity-0 group-hover/vision:opacity-100",
              "bg-violet-400/50 hover:bg-violet-500/70 rounded-l",
            )}
          />
          <div
            role="separator"
            aria-label="右へドラッグして別の日へ複製"
            title="横にドラッグして別の日へ複製"
            onPointerDown={onHorizontalDuplicatePointerDown}
            className={cn(
              "absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 cursor-ew-resize z-20",
              "opacity-0 group-hover/vision:opacity-100",
              "bg-violet-400/50 hover:bg-violet-500/70 rounded-r",
            )}
          />
        </>
      )}
    </div>
  );
}
