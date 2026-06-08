"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { BoxListItem } from "@/components/BoxListItem";
import { BoxFormDialog } from "@/components/BoxFormDialog";
import { WarningBanner } from "@/components/WarningBanner";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { toMinutes } from "@/lib/timeBlocks";
import { aggregateByType, diagnoseDay } from "@/lib/diagnose";
import { BOX_TYPES, getBoxTypeMeta } from "@/lib/boxTypes";
import type { Box } from "@/lib/types";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <TodayPage />
    </HydrationGate>
  );
}

function TodayPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);

  const todayBoxes = useMemo(
    () =>
      allBoxes
        .filter(
          (b) => !b.isPooled && b.date === today && b.status !== "deleted",
        )
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [allBoxes, today],
  );

  const diagnosis = useMemo(() => diagnoseDay(todayBoxes), [todayBoxes]);
  const totals = useMemo(() => aggregateByType(todayBoxes), [todayBoxes]);

  const priorityBoxes = todayBoxes.filter((b) => b.type === "priority");
  const otherBoxes = todayBoxes.filter((b) => b.type !== "priority");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="今日ビュー"
        description={format(new Date(), "yyyy年M月d日 (EEEE)")}
        right={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            今日に追加
          </Button>
        }
      />

      <div className="mb-6">
        <WarningBanner diagnosis={diagnosis} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {BOX_TYPES.slice(0, 5).map((t) => {
          const mins = totals[t.type];
          return (
            <div
              key={t.type}
              className={`rounded-xl border ${t.border} ${t.bgSoft} p-3`}
            >
              <div className={`text-[10px] font-medium ${t.text}`}>
                {t.emoji} {t.shortLabel}
              </div>
              <div className={`mt-1 text-lg font-bold ${t.text}`}>
                {Math.floor(mins / 60)}
                <span className="text-xs font-medium">h</span>{" "}
                {mins % 60}
                <span className="text-xs font-medium">m</span>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>{getBoxTypeMeta("priority").emoji}</span>
            今日の優先ボックス
            <span className="text-xs text-muted font-normal">
              （{priorityBoxes.length}/3）
            </span>
          </h2>
        </div>
        {priorityBoxes.length === 0 ? (
          <EmptyState
            message="今日の最重要タスクを2〜3個に絞って配置しましょう。"
            actionLabel="優先ボックスを追加"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {priorityBoxes.map((b) => (
              <BoxListItem key={b.id} box={b} onEdit={setEditingBox} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          今日のすべてのボックス
        </h2>
        {otherBoxes.length === 0 && priorityBoxes.length === 0 ? (
          <EmptyState
            message="今日のスケジュールはまだ空です。固定予定から配置していきましょう。"
            actionLabel="ボックスを追加"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {otherBoxes.map((b) => (
              <BoxListItem key={b.id} box={b} onEdit={setEditingBox} />
            ))}
          </div>
        )}
      </section>

      <BoxFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        preset={{ date: today }}
      />
      <BoxFormDialog
        open={!!editingBox}
        onClose={() => setEditingBox(undefined)}
        initial={editingBox}
      />
    </div>
  );
}

function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <p className="text-sm text-muted mb-3">{message}</p>
      <Button onClick={onAction} variant="outline" size="sm">
        <Plus size={14} />
        {actionLabel}
      </Button>
    </div>
  );
}
