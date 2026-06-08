"use client";

import { useState } from "react";
import type { Box } from "@/lib/types";
import { TIME_BLOCKS, toMinutes } from "@/lib/timeBlocks";
import { toISODate, weekDays, formatShortDay, formatDay } from "@/lib/date";
import { DraggableBoxItem } from "./DraggableBoxItem";
import { DroppableCell } from "./DroppableCell";
import { BoxFormDialog } from "./BoxFormDialog";
import { cn } from "@/lib/cn";
import { isToday } from "date-fns";

/** セル内（2時間 = 120分）のレーン割当。
 *  時間が重ならないボックスは同レーンに詰め、重なれば隣のレーンへ。
 */
function assignLanes<T extends { id: string; startTime: string; endTime: string }>(
  boxes: T[],
): { laneOf: Map<string, number>; totalLanes: number } {
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
  return { laneOf, totalLanes: Math.max(1, laneEnds.length) };
}

interface Props {
  anchorDate: Date;
  boxes: Box[];
}

export function WeekGrid({ anchorDate, boxes }: Props) {
  const days = weekDays(anchorDate);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);

  const openEdit = (box: Box) => {
    setEditingBox(box);
    setFormOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <div className="min-w-[900px]">
          {/* ヘッダー（曜日） */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: "92px repeat(7, minmax(0, 1fr))" }}
          >
            <div className="px-3 py-3 text-xs font-medium text-muted bg-slate-50" />
            {days.map((d) => {
              const today = isToday(d);
              return (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "px-2 py-3 text-center border-l border-border",
                    today ? "bg-indigo-50" : "bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-medium",
                      today ? "text-indigo-700" : "text-muted",
                    )}
                  >
                    {formatShortDay(d)}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-lg font-semibold",
                      today ? "text-indigo-700" : "text-slate-800",
                    )}
                  >
                    {formatDay(d)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 時間ブロック */}
          {TIME_BLOCKS.map((block) => (
            <div
              key={block.start}
              className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: "92px repeat(7, minmax(0, 1fr))" }}
            >
              <div className="px-3 py-3 text-xs text-muted bg-slate-50/60 border-r border-border">
                <div className="font-semibold text-slate-700">
                  {block.start}
                </div>
                <div className="text-[10px]">- {block.end}</div>
              </div>
              {days.map((d) => {
                const dateIso = toISODate(d);
                const blockStartMin = toMinutes(block.start);
                const blockEndMin = toMinutes(block.end);
                const blockDur = blockEndMin - blockStartMin; // = 120
                // 「このセルが開始セル」のボックスだけを表示
                // （長時間ボックスでも開始セルに一回だけ描画）
                const cellBoxes = boxes.filter((b) => {
                  if (b.isPooled || b.status === "deleted") return false;
                  if (b.date !== dateIso) return false;
                  const s = toMinutes(b.startTime);
                  return s >= blockStartMin && s < blockEndMin;
                });
                const { laneOf, totalLanes } = assignLanes(cellBoxes);
                const dropId = `cell|${dateIso}|${block.start}|${block.end}`;
                return (
                  <DroppableCell
                    key={`${dateIso}-${block.start}`}
                    dropId={dropId}
                    data={{
                      kind: "grid",
                      date: dateIso,
                      startTime: block.start,
                      endTime: block.end,
                    }}
                    className="border-l border-border h-40 relative"
                  >
                    {/* 30分ガイド線（30 / 60 / 90 分目） */}
                    {[0.25, 0.5, 0.75].map((p) => (
                      <div
                        key={p}
                        className="absolute left-0 right-0 border-t border-dashed border-slate-100 pointer-events-none"
                        style={{ top: `${p * 100}%` }}
                      />
                    ))}

                    {cellBoxes.map((b) => {
                      const sMin = toMinutes(b.startTime);
                      const eMin = toMinutes(b.endTime);
                      const topPct =
                        ((sMin - blockStartMin) / blockDur) * 100;
                      const rawHPct = ((eMin - sMin) / blockDur) * 100;
                      const heightPct = Math.min(
                        Math.max(rawHPct, 10), // 最低 10%（12分相当）は確保して視認性を担保
                        100 - topPct,
                      );
                      const lane = laneOf.get(b.id) ?? 0;
                      return (
                        <div
                          key={b.id}
                          className="absolute"
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `calc(${(lane / totalLanes) * 100}% + 2px)`,
                            width: `calc(${(1 / totalLanes) * 100}% - 4px)`,
                          }}
                        >
                          <DraggableBoxItem
                            box={b}
                            dragId={`box|${b.id}`}
                            origin={{
                              kind: "grid",
                              date: b.date,
                              startTime: b.startTime,
                              endTime: b.endTime,
                            }}
                            onClick={() => openEdit(b)}
                            compact
                            fillHeight
                          />
                        </div>
                      );
                    })}

                  </DroppableCell>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <BoxFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingBox(undefined);
        }}
        initial={editingBox}
      />
    </>
  );
}

