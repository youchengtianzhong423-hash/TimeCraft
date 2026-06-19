"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { getLocalDateKey } from "@/lib/date";
import { ja } from "date-fns/locale";
import { Plus } from "lucide-react";
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
import { BoxFormDialog } from "@/components/BoxFormDialog";
import { WarningBanner } from "@/components/WarningBanner";
import { DayScheduleGrid } from "@/components/DayScheduleGrid";
import { PlannerSidebar } from "@/components/PlannerSidebar";
import { TodayMemoPanel } from "@/components/TodayMemoPanel";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { ScheduleViewToggle } from "@/components/ScheduleViewToggle";
import { UndoRedoToolbar } from "@/components/UndoRedoToolbar";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { durationMinutes } from "@/lib/timeBlocks";
import { aggregateByType, diagnoseDay } from "@/lib/diagnose";
import { HydrationGate } from "@/components/HydrationGate";
import { useTimeCraftShortcuts } from "@/hooks/useTimeCraftShortcuts";
import { useScheduleDragEnd } from "@/hooks/useScheduleDragEnd";
import type { Box } from "@/lib/types";

export default function Page() {
  return (
    <HydrationGate>
      <TodayPage />
    </HydrationGate>
  );
}

function formatHoursMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}

function TodayPage() {
  const today = getLocalDateKey();
  const todayDate = useMemo(() => new Date(), []);
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPreset, setCreatePreset] = useState<{ date: string; startTime?: string }>({
    date: today,
  });
  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);

  const todayBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) => !b.isPooled && b.date === today && b.status !== "deleted",
      ),
    [allBoxes, today],
  );

  const diagnosis = useMemo(() => diagnoseDay(todayBoxes), [todayBoxes]);
  const totals = useMemo(() => aggregateByType(todayBoxes), [todayBoxes]);

  const scheduledMin = useMemo(
    () =>
      todayBoxes.reduce(
        (acc, b) => acc + durationMinutes(b.startTime, b.endTime),
        0,
      ) - totals.whitespace,
    [todayBoxes, totals.whitespace],
  );

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
    anchor: todayDate,
    altHeldRef,
  });

  const collisionDetection = (
    args: Parameters<typeof closestCenter>[0],
  ) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    return closestCenter(args);
  };

  const openCreate = (startTime?: string) => {
    setCreatePreset({ date: today, startTime });
    setCreateOpen(true);
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-4xl mx-auto">
      <PageHeader
        title="今日ビュー"
        description={format(todayDate, "yyyy年M月d日 (EEEE)", { locale: ja })}
        left={<UndoRedoToolbar />}
        right={
          <>
            <ScheduleViewToggle />
            <ShortcutHelp />
            <Button onClick={() => openCreate()}>
              <Plus size={14} />
              今日に追加
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-700">
        <span>
          予定：<strong>{todayBoxes.length}</strong>件
        </span>
        <span>
          予定時間：<strong>{formatHoursMinutes(Math.max(0, scheduledMin))}</strong>
        </span>
        <span>
          余白：<strong>{formatHoursMinutes(totals.whitespace)}</strong>
        </span>
      </div>

      {diagnosis.level !== "ok" && (
        <div className="mb-4">
          <WarningBanner diagnosis={diagnosis} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
          <div className="w-full md:w-auto md:sticky md:top-4 z-10 shrink-0 flex flex-col gap-3">
            <PlannerSidebar
              anchorDate={todayDate}
              className="w-full md:w-auto"
            />
            <TodayMemoPanel
              dateIso={today}
              anchorDate={todayDate}
              className="w-full md:w-52"
            />
          </div>
          <div className="flex-1 min-w-0 w-full">
            {todayBoxes.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-5 py-10 text-center mb-2"
                onDoubleClick={() => openCreate("09:00")}
              >
                <p className="text-sm font-medium text-slate-800 mb-2">
                  今日の予定はまだありません
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  週間ビューから予定を追加するか、
                  <br />
                  この画面をダブルクリックしてボックスを作成できます。
                </p>
              </div>
            ) : null}
            <DayScheduleGrid
              dateIso={today}
              boxes={allBoxes}
              onEditBox={setEditingBox}
              onCreateAt={(startTime) => openCreate(startTime)}
            />
          </div>
        </div>
      </DndContext>

      <BoxFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        preset={createPreset}
        weekAnchor={todayDate}
      />
      <BoxFormDialog
        open={!!editingBox}
        onClose={() => setEditingBox(undefined)}
        initial={editingBox}
        weekAnchor={todayDate}
      />
    </div>
  );
}
