"use client";

import type { CSSProperties } from "react";
import type { Box } from "@/lib/types";
import {
  buildPlannerHourBlocks,
  overlapsPlannerDay,
  PLANNER_BLOCK_COUNT,
  toMinutes,
} from "@/lib/timeBlocks";
import { quarterSlotsForHour } from "@/lib/plannerSlots";
import { toISODate, weekDays, formatShortDay, formatDay } from "@/lib/date";
import { DroppableCell } from "./DroppableCell";
import { DroppableTop3Slot } from "./DroppableTop3Slot";
import { Top3TaskTitle } from "./Top3TaskTitle";
import { Top3PrioritySelect } from "./Top3PrioritySelect";
import { VisionScheduleBox } from "./VisionScheduleBox";
import { RealReflectionCell } from "./RealReflectionCell";
import { findBoxInTop3Slot } from "@/lib/top3";
import { cn } from "@/lib/cn";
import { isToday } from "date-fns";
import { useTimeCraftStore, useWeekPlanner } from "@/store/useTimeCraftStore";
import { Check } from "lucide-react";

function assignLanes<T extends { id: string; startTime: string; endTime: string }>(
  boxes: T[],
): { laneOf: Map<string, number>; totalLanesOf: Map<string, number> } {
  const sorted = [...boxes].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  );
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  for (const b of sorted) {
    const s = toMinutes(b.startTime);
    const e = toMinutes(b.endTime);
    let laneIdx = laneEnds.findIndex((end) => end <= s);
    if (laneIdx === -1) {
      laneEnds.push(e);
      laneIdx = laneEnds.length - 1;
    } else {
      laneEnds[laneIdx] = e;
    }
    laneOf.set(b.id, laneIdx);
  }

  const totalLanesOf = new Map<string, number>();
  for (const b of boxes) {
    const bs = toMinutes(b.startTime);
    const be = toMinutes(b.endTime);
    let count = 1;
    for (const other of boxes) {
      if (other.id === b.id) continue;
      const os = toMinutes(other.startTime);
      const oe = toMinutes(other.endTime);
      if (os < be && oe > bs) count++;
    }
    totalLanesOf.set(b.id, count);
  }

  return { laneOf, totalLanesOf };
}

const COLS = "56px repeat(7, minmax(0, 1fr) minmax(0, 1fr))";
const PLANNER_CELL_H = "h-[52px]";

/** 正午・真夜中の境界線スタイル（太い底辺ボーダー） */
const DIVIDER_STYLE: CSSProperties = {
  borderBottomWidth: "2px",
  borderBottomColor: "#94a3b8",
};

interface Props {
  anchorDate: Date;
  boxes: Box[];
}

export function WeekPlannerGrid({ anchorDate, boxes }: Props) {
  const days = weekDays(anchorDate);
  const setDailyPriority = useTimeCraftStore((s) => s.setDailyPriority);
  const completeBox = useTimeCraftStore((s) => s.completeBox);
  const scheduleStartHour = useTimeCraftStore((s) => s.scheduleStartHour);
  const planner = useWeekPlanner(anchorDate);

  // 動的タイムライン定数
  const plannerHourBlocks = buildPlannerHourBlocks(scheduleStartHour);
  const dayStartMin = scheduleStartHour * 60;
  const dayDurMin = PLANNER_BLOCK_COUNT * 60; // 常に 18h
  const dayEndMin = dayStartMin + dayDurMin;

  /** ブロックインデックス i が境界線（太い底辺ボーダー）を持つか
   *  - 絶対時 11 → 正午（12:00）直前 = AM/PM 境界
   *  - 絶対時 23 → 真夜中（0:00）直前 = scheduleStartHour >= 7 のとき表示範囲内 */
  const hasDividerBottom = (i: number): boolean => {
    const absHour = scheduleStartHour + i;
    if (absHour === 11) return true;
    if (absHour === 23 && scheduleStartHour >= 7) return true;
    return false;
  };

  function filterVisionBoxesForDay(dateIso: string): Box[] {
    return boxes.filter(
      (b) =>
        !b.isPooled &&
        b.status !== "deleted" &&
        b.date === dateIso &&
        b.status !== "completed" &&
        overlapsPlannerDay(b.startTime, b.endTime, dayStartMin, dayEndMin),
    );
  }

  function filterRealBoxesForDay(dateIso: string): Box[] {
    return boxes.filter(
      (b) =>
        !b.isPooled &&
        b.status !== "deleted" &&
        b.date === dateIso &&
        b.status === "completed" &&
        overlapsPlannerDay(b.startTime, b.endTime, dayStartMin, dayEndMin),
    );
  }

  function filterCompletedInBlock(
    dayBoxes: Box[],
    blockStart: string,
    blockEnd: string,
  ): Box[] {
    const bs = toMinutes(blockStart);
    const be = toMinutes(blockEnd);
    return dayBoxes.filter((b) => {
      const s = toMinutes(b.startTime);
      return s >= bs && s < be;
    });
  }

  function boxLayoutStyle(
    box: Box,
    lane: number,
    totalLanes: number,
  ): CSSProperties {
    const sMin = Math.max(toMinutes(box.startTime), dayStartMin);
    const eMin = Math.min(toMinutes(box.endTime), dayEndMin);
    const topPct = ((sMin - dayStartMin) / dayDurMin) * 100;
    const rawHPct = ((eMin - sMin) / dayDurMin) * 100;
    const heightPct = Math.min(Math.max(rawHPct, 2.5), 100 - topPct);
    const laneGap = totalLanes > 1 ? 1 : 0;
    const laneWidthPct = 100 / totalLanes;
    return {
      top: `${topPct}%`,
      height: `${heightPct}%`,
      left:
        lane === 0
          ? "0"
          : `calc(${lane * laneWidthPct}% + ${laneGap}px)`,
      width:
        totalLanes === 1
          ? "100%"
          : `calc(${laneWidthPct}% - ${laneGap}px)`,
    };
  }

  const renderVisionOverlay = (dayBoxes: Box[]) => {
    const { laneOf, totalLanesOf } = assignLanes(dayBoxes);
    return dayBoxes.map((b) => (
      <VisionScheduleBox
        key={b.id}
        box={b}
        timelineStartMin={dayStartMin}
        timelineDurMin={dayDurMin}
        style={boxLayoutStyle(b, laneOf.get(b.id) ?? 0, totalLanesOf.get(b.id) ?? 1)}
      />
    ));
  };

  const renderRealOverlay = (dayBoxes: Box[]) => {
    const { laneOf, totalLanesOf } = assignLanes(dayBoxes);
    return dayBoxes.map((b) => (
      <div
        key={b.id}
        className="absolute pointer-events-none"
        style={boxLayoutStyle(b, laneOf.get(b.id) ?? 0, totalLanesOf.get(b.id) ?? 1)}
      >
        <div className="w-full h-full rounded-md border border-emerald-200 bg-emerald-50/90 px-1 py-0.5 text-[9px] leading-tight text-emerald-900 overflow-hidden">
          <span className="font-semibold block truncate">{b.title}</span>
        </div>
      </div>
    ));
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <div className="min-w-[1100px]">
          {/* 曜日ヘッダー */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="bg-slate-50 border-r border-border" />
            {days.map((d) => {
              const today = isToday(d);
              const dateIso = toISODate(d);
              return (
                <div
                  key={dateIso}
                  className={cn(
                    "col-span-2 border-l border-border px-1 py-2 text-center",
                    today ? "bg-indigo-50" : "bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "text-[10px] font-medium",
                      today ? "text-indigo-600" : "text-muted",
                    )}
                  >
                    {formatShortDay(d)}
                  </div>
                  <div
                    className={cn(
                      "text-base font-bold",
                      today ? "text-indigo-800" : "text-slate-800",
                    )}
                  >
                    {formatDay(d)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 3 + Daily Priority */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="bg-white border-r border-border px-1 py-1 text-[9px] text-muted font-medium">
              Top3
            </div>
            {days.map((d) => {
              const dateIso = toISODate(d);
              return (
                <div
                  key={`top-${dateIso}`}
                  className="col-span-2 border-l border-border bg-white px-1 py-1 space-y-0.5"
                >
                  {[0, 1, 2].map((i) => {
                    const b = findBoxInTop3Slot(boxes, dateIso, i);
                    return (
                      <DroppableTop3Slot
                        key={i}
                        date={dateIso}
                        slotIndex={i}
                        className="group/top3 flex items-center gap-0.5 min-h-[18px] min-w-0"
                      >
                        <span className="text-[9px] text-slate-400 w-3 shrink-0 tabular-nums">
                          {i + 1}
                        </span>
                        {b ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (b.status === "completed") return;
                                completeBox(
                                  b.id,
                                  { asPlanned: true, focused: 4 },
                                  b.plannedDuration,
                                );
                              }}
                              className={cn(
                                "shrink-0 h-3.5 w-3.5 rounded border flex items-center justify-center",
                                b.status === "completed"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-slate-300 hover:border-indigo-400",
                              )}
                            >
                              {b.status === "completed" && (
                                <Check size={10} strokeWidth={3} />
                              )}
                            </button>
                            <Top3TaskTitle
                              box={b}
                              dateIso={dateIso}
                              slotIndex={i}
                            />
                          </>
                        ) : (
                          <span
                            className="text-[9px] text-slate-300 flex-1 min-w-0 truncate"
                            aria-hidden
                          >
                            —
                          </span>
                        )}
                        <Top3PrioritySelect
                          dateIso={dateIso}
                          slotIndex={i}
                          className="ml-0.5"
                        />
                      </DroppableTop3Slot>
                    );
                  })}
                  <input
                    type="text"
                    className="w-full mt-1 rounded border border-slate-200 px-1 py-0.5 text-[9px]"
                    placeholder="Daily Priority"
                    value={planner.dailyPriority[dateIso] ?? ""}
                    onChange={(e) =>
                      setDailyPriority(dateIso, e.target.value, anchorDate)
                    }
                  />
                </div>
              );
            })}
          </div>

          {/* Vision / Real */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="bg-slate-50 border-r border-border" />
            {days.map((d) => (
              <div
                key={`vr-${toISODate(d)}`}
                className="col-span-2 grid grid-cols-2 border-l border-border"
              >
                <div className="text-center py-1 text-[9px] font-bold text-indigo-600 bg-indigo-50/50 border-r border-border">
                  Vision
                </div>
                <div className="text-center py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50/50">
                  Real
                </div>
              </div>
            ))}
          </div>

          {/* 時間グリッド */}
          <div
            className="grid"
            style={{ gridTemplateColumns: COLS }}
          >
            {/* 時間ラベル列 */}
            <div className="border-r border-border bg-slate-50/80 flex flex-col">
              {plannerHourBlocks.map((block, i) => (
                <div
                  key={block.start}
                  className={cn(
                    PLANNER_CELL_H,
                    "shrink-0 border-b border-border px-1.5 pt-1 text-[10px] font-medium text-slate-600 text-right",
                  )}
                  style={hasDividerBottom(i) ? DIVIDER_STYLE : undefined}
                >
                  {block.label}
                </div>
              ))}
            </div>

            {days.map((d) => {
              const dateIso = toISODate(d);
              const visionBoxes = filterVisionBoxesForDay(dateIso);
              const realBoxes = filterRealBoxesForDay(dateIso);

              return (
                <div
                  key={dateIso}
                  className="col-span-2 grid grid-cols-2 border-l border-border"
                >
                  {/* Vision 列 */}
                  <div className="relative flex flex-col border-r border-border bg-white">
                    {plannerHourBlocks.map((block, i) => {
                      const isPastMidnight = scheduleStartHour + i >= 24;
                      return (
                        <div
                          key={block.start}
                          className={cn(
                            PLANNER_CELL_H,
                            "shrink-0 border-b border-border flex flex-col",
                          )}
                          style={hasDividerBottom(i) ? DIVIDER_STYLE : undefined}
                        >
                          {isPastMidnight ? null : (
                            quarterSlotsForHour(block.start, block.end).map(
                              (slot) => (
                                <DroppableCell
                                  key={slot.start}
                                  dropId={`cell|${dateIso}|${slot.start}|${slot.end}`}
                                  data={{
                                    kind: "grid",
                                    date: dateIso,
                                    startTime: slot.start,
                                    endTime: slot.end,
                                  }}
                                  className="flex-1 min-h-0 relative border-t border-slate-50 first:border-t-0"
                                >
                                  {null}
                                </DroppableCell>
                              ),
                            )
                          )}
                        </div>
                      );
                    })}
                    <div
                      className="absolute inset-0 z-10 pointer-events-none"
                      aria-hidden={visionBoxes.length === 0}
                    >
                      <div className="relative h-full w-full">
                        {renderVisionOverlay(visionBoxes)}
                      </div>
                    </div>
                  </div>

                  {/* Real 列 */}
                  <div className="relative flex flex-col bg-slate-50/30">
                    {plannerHourBlocks.map((block, i) => (
                      <div
                        key={block.start}
                        className={cn(
                          PLANNER_CELL_H,
                          "shrink-0 border-b border-border relative z-0",
                        )}
                        style={hasDividerBottom(i) ? DIVIDER_STYLE : undefined}
                      >
                        <RealReflectionCell
                          dateIso={dateIso}
                          blockStart={block.start}
                          blockEnd={block.end}
                          anchorDate={anchorDate}
                          completedInBlock={filterCompletedInBlock(
                            realBoxes,
                            block.start,
                            block.end,
                          )}
                          className="absolute inset-0"
                        />
                      </div>
                    ))}
                    <div
                      className="absolute inset-0 z-10 pointer-events-none"
                      aria-hidden={realBoxes.length === 0}
                    >
                      <div className="relative h-full w-full">
                        {renderRealOverlay(realBoxes)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
