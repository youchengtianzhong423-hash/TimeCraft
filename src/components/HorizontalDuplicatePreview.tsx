"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Box } from "@/lib/types";
import { getBoxTypeMeta } from "@/lib/boxTypes";
import { toMinutes } from "@/lib/timeBlocks";
import { cn } from "@/lib/cn";

export interface HorizontalDuplicatePreviewState {
  sourceBox: Pick<Box, "id" | "type" | "title" | "startTime" | "endTime" | "date">;
  targetDates: string[];
  timelineStartMin: number;
  timelineDurMin: number;
}

interface ContextValue {
  preview: HorizontalDuplicatePreviewState | null;
  setPreview: (state: HorizontalDuplicatePreviewState | null) => void;
}

const HorizontalDuplicatePreviewContext =
  createContext<ContextValue | null>(null);

export function HorizontalDuplicatePreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preview, setPreview] =
    useState<HorizontalDuplicatePreviewState | null>(null);
  const value = useMemo(
    () => ({ preview, setPreview }),
    [preview],
  );
  return (
    <HorizontalDuplicatePreviewContext.Provider value={value}>
      {children}
    </HorizontalDuplicatePreviewContext.Provider>
  );
}

export function useHorizontalDuplicatePreview() {
  const ctx = useContext(HorizontalDuplicatePreviewContext);
  if (!ctx) {
    return {
      preview: null as HorizontalDuplicatePreviewState | null,
      setPreview: (_: HorizontalDuplicatePreviewState | null) => {},
    };
  }
  return ctx;
}

function previewLayoutStyle(
  startTime: string,
  endTime: string,
  timelineStartMin: number,
  timelineDurMin: number,
): CSSProperties {
  const sMin = Math.max(toMinutes(startTime), timelineStartMin);
  const eMin = Math.min(toMinutes(endTime), timelineStartMin + timelineDurMin);
  const topPct = ((sMin - timelineStartMin) / timelineDurMin) * 100;
  const rawHPct = ((eMin - sMin) / timelineDurMin) * 100;
  const heightPct = Math.min(Math.max(rawHPct, 2.5), 100 - topPct);
  return {
    top: `${topPct}%`,
    height: `${heightPct}%`,
    left: "0",
    width: "100%",
  };
}

function hasTimeOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime)
  );
}

export function usePreviewConflict(
  dateIso: string,
  preview: HorizontalDuplicatePreviewState | null,
  boxes: Box[],
): boolean {
  return useMemo(() => {
    if (!preview || !preview.targetDates.includes(dateIso)) return false;
    const ghost = {
      startTime: preview.sourceBox.startTime,
      endTime: preview.sourceBox.endTime,
    };
    return boxes.some(
      (b) =>
        b.id !== preview.sourceBox.id &&
        b.date === dateIso &&
        !b.isPooled &&
        b.status !== "deleted" &&
        hasTimeOverlap(b, ghost),
    );
  }, [boxes, dateIso, preview]);
}

interface LayerProps {
  dateIso: string;
  boxes: Box[];
}

export function HorizontalCopyPreviewLayer({ dateIso, boxes }: LayerProps) {
  const { preview } = useHorizontalDuplicatePreview();
  const hasConflict = usePreviewConflict(dateIso, preview, boxes);

  if (!preview || !preview.targetDates.includes(dateIso)) return null;

  const meta = getBoxTypeMeta(preview.sourceBox.type);
  const style = previewLayoutStyle(
    preview.sourceBox.startTime,
    preview.sourceBox.endTime,
    preview.timelineStartMin,
    preview.timelineDurMin,
  );

  return (
    <div
      className={cn(
        "absolute rounded-md border-2 border-dashed pointer-events-none z-[25]",
        "opacity-40",
        meta.bgSoft,
        meta.border,
        hasConflict && "border-rose-500 ring-2 ring-rose-400/60 opacity-55",
      )}
      style={style}
      aria-hidden
    >
      <div
        className={cn(
          "h-full w-full px-1 py-0.5 text-[9px] leading-tight truncate",
          meta.text,
        )}
      >
        {preview.sourceBox.title || meta.shortLabel}
        {hasConflict ? (
          <span className="block text-[8px] text-rose-600 font-medium">
            重なり
          </span>
        ) : null}
      </div>
    </div>
  );
}
