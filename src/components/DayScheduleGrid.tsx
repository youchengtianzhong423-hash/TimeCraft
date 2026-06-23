"use client";

import { useRef, type CSSProperties } from "react";
import type { Box } from "@/lib/types";
import {
  buildPlannerHourBlocks,
  buildReflectionBlocks,
  minutesToHHmm,
  overlapsPlannerDay,
  PLANNER_BLOCK_COUNT,
  snapScheduleMinutes,
  toMinutes,
} from "@/lib/timeBlocks";
import { quarterSlotsForHour } from "@/lib/plannerSlots";
import { DroppableCell } from "./DroppableCell";
import { RealReflectionCell } from "./RealReflectionCell";
import { VisionScheduleBox } from "./VisionScheduleBox";
import { CurrentTimeLine, useScrollToCurrentTime } from "./CurrentTimeLine";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { cn } from "@/lib/cn";

const PLANNER_CELL_H = "h-[52px]";

function assignLanes<T extends { id: string; startTime: string; endTime: string }>(
  boxes: T[],
) {
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

interface Props {
  dateIso: string;
  anchorDate: Date;
  boxes: Box[];
  onEditBox?: (box: Box) => void;
  onCreateAt?: (startTime: string) => void;
}

export function DayScheduleGrid({
  dateIso,
  anchorDate,
  boxes,
  onEditBox,
  onCreateAt,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scheduleStartHour = useTimeCraftStore((s) => s.scheduleStartHour);
  const selectedBoxId = useTimeCraftStore((s) => s.selectedBoxId);
  const setSelectedBoxId = useTimeCraftStore((s) => s.setSelectedBoxId);

  const plannerHourBlocks = buildPlannerHourBlocks(scheduleStartHour);
  const reflectionBlocks = buildReflectionBlocks(plannerHourBlocks);
  const dayStartMin = scheduleStartHour * 60;
  const dayDurMin = PLANNER_BLOCK_COUNT * 60;
  const dayEndMin = dayStartMin + dayDurMin;

  useScrollToCurrentTime(scrollRef, dateIso, dayStartMin, true);

  const dayBoxes = boxes.filter(
    (b) =>
      !b.isPooled &&
      b.status !== "deleted" &&
      b.date === dateIso &&
      overlapsPlannerDay(b.startTime, b.endTime, dayStartMin, dayEndMin),
  );

  const { laneOf, totalLanesOf } = assignLanes(dayBoxes);

  const completedBoxes = dayBoxes.filter((b) => b.status === "completed");

  const completedInBlock = (blockStart: string, blockEnd: string): Box[] => {
    const startMin = toMinutes(blockStart);
    const endMin = toMinutes(blockEnd);
    return completedBoxes.filter((b) => {
      const boxStartMin = toMinutes(b.startTime);
      return boxStartMin >= startMin && boxStartMin < endMin;
    });
  };

  const boxLayoutStyle = (
    box: Box,
    lane: number,
    totalLanes: number,
  ): CSSProperties => {
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
        lane === 0 ? "0" : `calc(${lane * laneWidthPct}% + ${laneGap}px)`,
      width:
        totalLanes === 1
          ? "100%"
          : `calc(${laneWidthPct}% - ${laneGap}px)`,
    };
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-auto h-[calc(100vh-10rem)] min-h-[640px] max-h-[900px] rounded-2xl border border-border bg-white shadow-sm"
      onClick={() => setSelectedBoxId(null)}
    >
      <div className="flex min-h-[936px]">
        <div className="w-14 shrink-0 border-r border-border bg-slate-50/80">
          {plannerHourBlocks.map((block) => (
            <div
              key={block.start}
              className={cn(
                PLANNER_CELL_H,
                "border-b border-border px-1 pt-1 text-[10px] font-medium text-slate-600 text-right",
              )}
            >
              {block.label}
            </div>
          ))}
        </div>

        <div className="flex flex-1 min-w-0">
          <div
            className="relative flex-1 min-w-[18rem] flex flex-col bg-white"
            data-vision-day={dateIso}
            onDoubleClick={(e) => {
              if (!onCreateAt) return;
              if ((e.target as HTMLElement).closest("[data-schedule-box]")) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientY - rect.top) / rect.height;
              const min = dayStartMin + ratio * dayDurMin;
              onCreateAt(minutesToHHmm(snapScheduleMinutes(min)));
            }}
          >
            {plannerHourBlocks.map((block, i) => {
              const isPastMidnight = scheduleStartHour + i >= 24;
              return (
                <div
                  key={block.start}
                  className={cn(
                    PLANNER_CELL_H,
                    "shrink-0 border-b border-border flex flex-col",
                  )}
                >
                  {!isPastMidnight &&
                    quarterSlotsForHour(block.start, block.end).map((slot) => (
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
                    ))}
                </div>
              );
            })}

            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="relative h-full w-full pointer-events-none">
                <CurrentTimeLine
                  dateIso={dateIso}
                  timelineStartMin={dayStartMin}
                  timelineDurMin={dayDurMin}
                />
                {dayBoxes.map((b) => (
                  <div key={b.id} className="pointer-events-auto">
                    <VisionScheduleBox
                      box={b}
                      weekDates={[dateIso]}
                      timelineStartMin={dayStartMin}
                      timelineDurMin={dayDurMin}
                      style={boxLayoutStyle(
                        b,
                        laneOf.get(b.id) ?? 0,
                        totalLanesOf.get(b.id) ?? 1,
                      )}
                      selected={selectedBoxId === b.id}
                      onSelect={() => setSelectedBoxId(b.id)}
                      onEdit={onEditBox ? () => onEditBox(b) : undefined}
                      showHorizontalHandles={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-[clamp(11rem,22%,16rem)] shrink-0 border-l border-border bg-slate-50/30">
            {reflectionBlocks.map((block) => (
              <div
                key={`${block.start}-${block.end}`}
                className="shrink-0 border-b border-border relative"
                style={{ height: `${block.sourceBlocks.length * 52}px` }}
              >
                <RealReflectionCell
                  dateIso={dateIso}
                  blockStart={block.start}
                  blockEnd={block.end}
                  anchorDate={anchorDate}
                  completedInBlock={completedInBlock(block.start, block.end)}
                  legacyBlocks={block.sourceBlocks}
                  className="absolute inset-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
