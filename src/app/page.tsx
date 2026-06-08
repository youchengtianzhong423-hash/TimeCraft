"use client";

import { useMemo, useState } from "react";
import { addWeeks, format, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { parseTop3DropId } from "@/lib/top3";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { WeekPlannerGrid } from "@/components/WeekPlannerGrid";
import { PlannerSidebar } from "@/components/PlannerSidebar";
import { BoxFormDialog } from "@/components/BoxFormDialog";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { isMultiDateRepeatRule } from "@/lib/repeatPlacements";
import { canHostPoolPlacements, isPoolMaster } from "@/lib/poolLink";
import {
  canDropBoxOntoTop3,
  canPlacePriorityOnVisionGrid,
} from "@/lib/priorityRules";
import { durationMinutes } from "@/lib/timeBlocks";
import { snapBoxMoveTimes } from "@/lib/plannerSlots";
import { weekStart, weekEnd } from "@/lib/date";
import { BOX_TYPES } from "@/lib/boxTypes";
import { aggregateByType } from "@/lib/diagnose";
import { HydrationGate } from "@/components/HydrationGate";

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
  const [dupMsg, setDupMsg] = useState<string | null>(null);
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const moveBoxOnGrid = useTimeCraftStore((s) => s.moveBoxOnGrid);
  const moveBoxToPool = useTimeCraftStore((s) => s.moveBoxToPool);
  const placeBoxFromPool = useTimeCraftStore((s) => s.placeBoxFromPool);
  const syncPoolMasterRepeatPlacements = useTimeCraftStore(
    (s) => s.syncPoolMasterRepeatPlacements,
  );
  const placeBoxInTop3 = useTimeCraftStore((s) => s.placeBoxInTop3);
  const duplicateWeekToNext = useTimeCraftStore((s) => s.duplicateWeekToNext);
  const reorderPool = useTimeCraftStore((s) => s.reorderPool);

  const weekBoxes = useMemo(() => {
    const start = weekStart(anchor);
    const end = weekEnd(anchor);
    return allBoxes.filter(
      (b) =>
        !b.isPooled && isWithinInterval(new Date(b.date), { start, end }),
    );
  }, [allBoxes, anchor]);

  const totals = useMemo(() => aggregateByType(weekBoxes), [weekBoxes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    if (!activeId.startsWith("box|")) return;
    const boxId = activeId.slice("box|".length);

    const overId = String(over.id);
    const origin = active.data.current?.origin as
      | {
          kind: "grid" | "pool" | "top3";
          date?: string;
          startTime?: string;
          endTime?: string;
          slotIndex?: number;
        }
      | undefined;

    // プール内の並び替え（sortable → sortable）
    if (origin?.kind === "pool" && overId.startsWith("box|")) {
      const overBoxId = overId.slice("box|".length);
      const overBox = allBoxes.find((b) => b.id === overBoxId);
      if (overBox?.isPooled && boxId !== overBoxId) {
        const poolMasters = [...allBoxes]
          .filter((b) => isPoolMaster(b))
          .sort((a, b) => {
            const ao = a.poolOrder ?? 0;
            const bo = b.poolOrder ?? 0;
            return ao !== bo ? ao - bo : a.createdAt.localeCompare(b.createdAt);
          });
        const activeIdx = poolMasters.findIndex((b) => b.id === boxId);
        const overIdx = poolMasters.findIndex((b) => b.id === overBoxId);
        if (activeIdx !== -1 && overIdx !== -1) {
          reorderPool(arrayMove(poolMasters, activeIdx, overIdx).map((b) => b.id));
        }
        return;
      }
    }

    if (overId === "pool") {
      if (origin?.kind === "pool") return;
      moveBoxToPool(boxId);
      return;
    }

    const top3Target = parseTop3DropId(overId);
    if (top3Target) {
      const { date, slotIndex } = top3Target;
      const box = allBoxes.find((b) => b.id === boxId);
      if (box && !canDropBoxOntoTop3(box, allBoxes)) return;
      if (
        origin?.kind === "top3" &&
        origin.date === date &&
        origin.slotIndex === slotIndex
      ) {
        return;
      }
      placeBoxInTop3(boxId, date, slotIndex);
      return;
    }

    if (overId.startsWith("cell|")) {
      const [, date, dropStart] = overId.split("|");
      const box = allBoxes.find((b) => b.id === boxId);
      if (box && !canPlacePriorityOnVisionGrid(box)) return;
      const dur =
        (box && durationMinutes(box.startTime, box.endTime)) ||
        box?.plannedDuration ||
        60;
      const { startTime, endTime } = snapBoxMoveTimes(dropStart, dur);
      if (
        origin?.kind === "grid" &&
        origin.date === date &&
        origin.startTime === startTime &&
        origin.endTime === endTime
      ) {
        return;
      }
      if (origin?.kind === "pool") {
        const master = allBoxes.find((b) => b.id === boxId);
        if (
          master &&
          canHostPoolPlacements(master) &&
          isMultiDateRepeatRule(master.repeatRule ?? "none")
        ) {
          syncPoolMasterRepeatPlacements(boxId, {
            repeatRule: master.repeatRule ?? "none",
            anchorDate: anchor,
            startDateIso: date,
            startTime,
            endTime,
          });
        } else {
          placeBoxFromPool(boxId, date, startTime, endTime);
        }
      } else {
        moveBoxOnGrid(boxId, date, startTime, endTime);
      }
    }
  };

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
        description="手帳風レイアウト。Vision＝計画、Real＝完了した実績。5:00〜22:00・15分刻みで移動・リサイズ。"
        right={
          <>
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
            <WeekPlannerGrid anchorDate={anchor} boxes={weekBoxes} />
          </div>
        </div>
      </DndContext>

      <BoxFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        preset={{ date: format(new Date(), "yyyy-MM-dd") }}
        weekAnchor={anchor}
      />
    </div>
  );
}
