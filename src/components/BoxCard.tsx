"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, CircleDashed, Pause, Play } from "lucide-react";
import type { Box } from "@/lib/types";
import { getBoxTypeMeta } from "@/lib/boxTypes";
import { durationMinutes } from "@/lib/timeBlocks";
import {
  scheduleDisplayDensity,
  type ScheduleDisplayDensity,
} from "@/lib/scheduleDisplay";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  onClick?: () => void;
  compact?: boolean;
  /** 親要素の高さいっぱいに広げる（週グリッドのタイムライン表示用） */
  fillHeight?: boolean;
  /** スケジュール表示用：クリックで編集ダイアログを開かない */
  readOnly?: boolean;
  /** やることリストのマスター向け：週間配置コピーの件数 */
  schedulePlacementCount?: number;
  /** 週間 Vision 用の表示密度（未指定時は時間の長さから自動） */
  scheduleDensity?: ScheduleDisplayDensity;
}

const STATUS_ICON: Record<Box["status"], React.ReactNode> = {
  notStarted: <CircleDashed size={12} />,
  inProgress: <Play size={12} />,
  paused: <Pause size={12} />,
  completed: <Check size={12} />,
  postponed: <CircleDashed size={12} />,
  deleted: null,
};

const TINY_HEIGHT_PX = 30;

export function BoxCard({
  box,
  onClick,
  compact,
  fillHeight,
  readOnly,
  schedulePlacementCount = 0,
  scheduleDensity: scheduleDensityProp,
}: Props) {
  const meta = getBoxTypeMeta(box.type);
  const done = box.status === "completed";
  const scheduleTile = readOnly && fillHeight;
  const dur = durationMinutes(box.startTime, box.endTime);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [forceMinimal, setForceMinimal] = useState(false);

  const densityFromDuration =
    scheduleDensityProp ?? scheduleDisplayDensity(dur);
  const scheduleDensity: ScheduleDisplayDensity = forceMinimal
    ? "minimal"
    : densityFromDuration;

  useEffect(() => {
    if (!scheduleTile || !measureRef.current) return;
    const el = measureRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setForceMinimal(h > 0 && h < TINY_HEIGHT_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scheduleTile]);

  const veryShort =
    scheduleTile || (fillHeight && dur > 0 && dur <= 30);
  const short = !scheduleTile && fillHeight && dur > 0 && dur <= 60;
  const showTime = !readOnly && !veryShort && !short;

  const className = cn(
    "w-full text-left rounded-md border overflow-hidden",
    meta.bg,
    meta.border,
    meta.text,
    done && "opacity-60 line-through",
    scheduleTile && scheduleDensity === "minimal" && "px-1 py-0",
    scheduleTile &&
      scheduleDensity === "compact" &&
      "px-1 py-0.5",
    scheduleTile && scheduleDensity === "full" && "py-0.5 px-1",
    !scheduleTile && compact && "p-1.5",
    !scheduleTile && !compact && "p-2",
    !scheduleTile && veryShort && "py-0.5 px-1.5",
    fillHeight && "h-full flex flex-col min-h-0",
    !readOnly && "transition-all hover:shadow-sm cursor-pointer",
    readOnly && !fillHeight && "cursor-default",
  );

  const statusEl = (
    <span
      className={cn(
        "shrink-0 opacity-60",
        scheduleDensity === "minimal" && "scale-[0.65]",
        scheduleDensity === "compact" && "scale-75",
      )}
    >
      {STATUS_ICON[box.status]}
    </span>
  );

  const scheduleInner = (() => {
    if (scheduleDensity === "minimal") {
      return (
        <div className="flex h-full min-h-0 items-center gap-0.5 leading-none">
          <span
            className={cn("h-1 w-1 rounded-full shrink-0", meta.dot)}
            title={meta.label}
          />
          <span
            className="flex-1 min-w-0 truncate text-[9px] font-semibold leading-none"
            title={box.title}
          >
            {box.title}
          </span>
          {statusEl}
        </div>
      );
    }
    if (scheduleDensity === "compact") {
      return (
        <div className="flex h-full min-h-0 flex-col justify-center gap-0 leading-none">
          <div className="flex min-w-0 items-center gap-0.5">
            <span
              className={cn("h-1 w-1 rounded-full shrink-0", meta.dot)}
              title={meta.label}
            />
            <span
              className="flex-1 min-w-0 truncate text-[9px] font-semibold leading-tight"
              title={box.title}
            >
              {box.title}
            </span>
            {statusEl}
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center gap-1 min-w-0 leading-none">
          <span className={cn("h-1 w-1 rounded-full shrink-0", meta.dot)} />
          <span className="text-[8px] font-medium uppercase tracking-wide opacity-75 shrink-0">
            {meta.shortLabel}
          </span>
          <span className="ml-auto shrink-0">{statusEl}</span>
        </div>
        <div
          className="mt-0.5 text-[10px] font-medium leading-tight truncate"
          title={box.title}
        >
          {box.title}
        </div>
      </>
    );
  })();

  const inner = scheduleTile ? (
    scheduleInner
  ) : (
    <>
      {!veryShort && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)}
          />
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
            {meta.shortLabel}
          </span>
          {box.googleEventId && (
            <span title="Google カレンダー連携" className="opacity-70">
              <Calendar size={10} />
            </span>
          )}
          <span className="ml-auto text-[10px] opacity-70 flex items-center gap-0.5">
            {STATUS_ICON[box.status]}
          </span>
        </div>
      )}
      <div
        className={cn(
          "font-medium leading-tight break-words",
          !veryShort && "mt-0.5",
          compact ? "text-[12px]" : "text-sm",
          veryShort && "text-[11px] truncate flex items-center gap-1",
        )}
      >
        {veryShort && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)}
          />
        )}
        <span className={veryShort ? "truncate" : ""}>{box.title}</span>
      </div>
      {showTime && (
        <div
          className={cn(
            "mt-0.5 opacity-80",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {box.startTime} – {box.endTime}
        </div>
      )}
      {schedulePlacementCount > 0 && (
        <div className="mt-0.5 text-[10px] font-medium text-indigo-700/90">
          週間に {schedulePlacementCount} 件配置中
        </div>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div ref={scheduleTile ? measureRef : undefined} className={className}>
        {inner}
      </div>
    );
  }

  return (
    <button onClick={onClick} type="button" className={className}>
      {inner}
    </button>
  );
}
