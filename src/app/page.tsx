"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addWeeks, format, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { WeekPlannerGrid } from "@/components/WeekPlannerGrid";
import { PlannerSidebar } from "@/components/PlannerSidebar";
import { BoxFormDialog } from "@/components/BoxFormDialog";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { ScheduleViewToggle } from "@/components/ScheduleViewToggle";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { getLocalDateKey, weekStart, weekEnd } from "@/lib/date";
import { BOX_TYPES } from "@/lib/boxTypes";
import { aggregateByType } from "@/lib/diagnose";
import { HydrationGate } from "@/components/HydrationGate";
import { UndoRedoToolbar } from "@/components/UndoRedoToolbar";
import { useTimeCraftShortcuts } from "@/hooks/useTimeCraftShortcuts";
import { useScheduleDragEnd } from "@/hooks/useScheduleDragEnd";
import type { Box } from "@/lib/types";

export default function Page() {
  return (
    <HydrationGate>
      <WeekPage />
    </HydrationGate>
  );
}

function WeekPage() {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);
  const [dupMsg, setDupMsg] = useState<string | null>(null);
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const duplicateWeekToNext = useTimeCraftStore((s) => s.duplicateWeekToNext);

  const weekBoxes = useMemo(() => {
    const start = weekStart(anchor);
    const end = weekEnd(anchor);
    return allBoxes.filter(
      (b) =>
        !b.isPooled && isWithinInterval(new Date(b.date), { start, end }),
    );
  }, [allBoxes, anchor]);

  const totals = useMemo(() => aggregateByType(weekBoxes), [weekBoxes]);

  const altHeldRef = useRef(false);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") altHeldRef.current = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") altHeldRef.current = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useTimeCraftShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useScheduleDragEnd({
    allBoxes,
    anchor,
    altHeldRef,
  });

  const collisionDetection = (
    args: Parameters<typeof closestCenter>[0],
  ) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    return closestCenter(args);
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <PageHeader
        title="週間スケジュール"
        description="手帳風レイアウト。Vision＝計画、Real＝完了した実績。Alt+ドラッグで複製・ダブルクリックで編集。"
        left={<UndoRedoToolbar />}
        right={
          <>
            <ScheduleViewToggle />
            <ShortcutHelp />
            <div className="inline-flex items-center rounded-lg border border-border bg-white">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAnchor(addWeeks(anchor, -1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className="px-2 text-xs text-slate-700 hover:text-indigo-600"
              >
                今週
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAnchor(addWeeks(anchor, 1))}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              title="今週の予定と週間メモを来週にコピー"
              onClick={() => {
                const n = duplicateWeekToNext(anchor);
                setDupMsg(
                  n > 0
                    ? `${n}件を来週に複製しました`
                    : "複製する予定がありませんでした",
                );
                setTimeout(() => setDupMsg(null), 3000);
              }}
            >
              <Copy size={14} />
              来週に複製
            </Button>
            {dupMsg ? (
              <span className="text-xs text-emerald-700">{dupMsg}</span>
            ) : null}
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              ボックスを追加
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap gap-1.5">
          {BOX_TYPES.map((t) => (
            <span
              key={t.type}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${t.bg} ${t.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
              {t.shortLabel}
              <span className="opacity-70">{Math.round(totals[t.type] / 60)}h</span>
            </span>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-row items-start gap-3 md:gap-4">
          <PlannerSidebar anchorDate={anchor} className="sticky top-4 z-10" />
          <div className="flex-1 min-w-0" data-week-planner>
            <WeekPlannerGrid
              anchorDate={anchor}
              boxes={weekBoxes}
              onEditBox={setEditingBox}
            />
          </div>
        </div>
      </DndContext>

      <BoxFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        preset={{ date: getLocalDateKey() }}
        weekAnchor={anchor}
      />
      <BoxFormDialog
        open={!!editingBox}
        onClose={() => setEditingBox(undefined)}
        initial={editingBox}
        weekAnchor={anchor}
      />
    </div>
  );
}
