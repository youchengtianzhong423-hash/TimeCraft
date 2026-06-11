"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getLocalDateKey } from "@/lib/date";
import { cn } from "@/lib/cn";

interface Props {
  timelineStartMin: number;
  timelineDurMin: number;
  /** 表示対象の日付 ISO */
  dateIso: string;
  className?: string;
}

export function CurrentTimeLine({
  timelineStartMin,
  timelineDurMin,
  dateIso,
  className,
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todayIso = getLocalDateKey(now);
  if (todayIso !== dateIso) return null;

  const min = now.getHours() * 60 + now.getMinutes();
  if (min < timelineStartMin || min > timelineStartMin + timelineDurMin) {
    return null;
  }

  const topPct =
    ((min - timelineStartMin) / timelineDurMin) * 100;

  return (
    <div
      className={cn("absolute left-0 right-0 z-30 pointer-events-none", className)}
      style={{ top: `${topPct}%` }}
      aria-hidden
    >
      <div className="flex items-center gap-1">
        <div className="h-px flex-1 bg-rose-400/80" />
        <span className="text-[9px] font-medium text-rose-600 bg-white/90 px-1 rounded">
          現在 {format(now, "H:mm")}
        </span>
        <div className="h-px flex-1 bg-rose-400/80" />
      </div>
    </div>
  );
}

/** 現在時刻付近へスクロール（初回のみ） */
export function useScrollToCurrentTime(
  containerRef: React.RefObject<HTMLElement | null>,
  dateIso: string,
  timelineStartMin: number,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const todayIso = getLocalDateKey();
    if (todayIso !== dateIso) return;

    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const rel = min - timelineStartMin;
    if (rel < 0) return;

    const el = containerRef.current;
    const ratio = rel / (18 * 60);
    el.scrollTop = Math.max(0, el.scrollHeight * ratio - el.clientHeight * 0.3);
  }, [containerRef, dateIso, enabled, timelineStartMin]);
}
