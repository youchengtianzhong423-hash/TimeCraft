"use client";

import { useMemo, useState } from "react";
import {
  addWeeks,
  format,
  isWithinInterval,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { BOX_TYPES } from "@/lib/boxTypes";
import { aggregateByType } from "@/lib/diagnose";
import { weekDays, weekEnd, weekStart } from "@/lib/date";
import { durationMinutes } from "@/lib/timeBlocks";
import type { Box } from "@/lib/types";
import { cn } from "@/lib/cn";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <AnalyticsPage />
    </HydrationGate>
  );
}

function AnalyticsPage() {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const allBoxes = useTimeCraftStore((s) => s.boxes);

  const start = weekStart(anchor);
  const end = weekEnd(anchor);
  const prevStart = weekStart(subWeeks(anchor, 1));
  const prevEnd = weekEnd(subWeeks(anchor, 1));

  const weekBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) =>
          !b.isPooled &&
          b.status !== "deleted" &&
          isWithinInterval(new Date(b.date), { start, end }),
      ),
    [allBoxes, start, end],
  );
  const prevBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) =>
          !b.isPooled &&
          b.status !== "deleted" &&
          isWithinInterval(new Date(b.date), {
            start: prevStart,
            end: prevEnd,
          }),
      ),
    [allBoxes, prevStart, prevEnd],
  );

  const totals = useMemo(() => aggregateByType(weekBoxes), [weekBoxes]);
  const prevTotals = useMemo(() => aggregateByType(prevBoxes), [prevBoxes]);

  const totalMin = Object.values(totals).reduce((a, b) => a + b, 0);
  const priorityBoxes = weekBoxes.filter((b) => b.type === "priority");
  const completedPriority = priorityBoxes.filter(
    (b) => b.status === "completed",
  ).length;
  const priorityRate =
    priorityBoxes.length === 0
      ? 0
      : Math.round((completedPriority / priorityBoxes.length) * 100);

  const plannedActualDiff = weekBoxes.reduce((acc, b) => {
    if (b.actualDuration !== undefined) {
      return acc + (b.actualDuration - b.plannedDuration);
    }
    return acc;
  }, 0);

  const days = weekDays(anchor);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="分析"
        description="自分の時間の使い方を客観的に確認し、来週の改善に活かしましょう。"
        right={
          <div className="inline-flex items-center rounded-lg border border-border bg-white">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAnchor(addWeeks(anchor, -1))}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 text-xs text-slate-700">
              {format(start, "M/d")} - {format(end, "M/d")}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAnchor(addWeeks(anchor, 1))}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="週間総予定時間"
          value={formatMin(totalMin)}
          diff={
            totalMin -
            Object.values(prevTotals).reduce((a, b) => a + b, 0)
          }
        />
        <KpiCard
          label="優先ボックス達成率"
          value={`${priorityRate}%`}
        />
        <KpiCard
          label="資産時間"
          value={formatMin(totals.asset)}
          diff={totals.asset - prevTotals.asset}
        />
        <KpiCard
          label="余白時間"
          value={formatMin(totals.whitespace)}
          diff={totals.whitespace - prevTotals.whitespace}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* タイプ別積上げ */}
        <section className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-1">
            タイプ別の合計時間
          </h3>
          <p className="text-xs text-muted mb-4">
            前週との差分を含めて表示します。
          </p>
          <div className="space-y-3">
            {BOX_TYPES.map((t) => {
              const min = totals[t.type];
              const prev = prevTotals[t.type];
              const max = Math.max(
                ...BOX_TYPES.map(
                  (tt) => Math.max(totals[tt.type], prevTotals[tt.type]) || 1,
                ),
              );
              const pct = (min / max) * 100;
              const diff = min - prev;
              return (
                <div key={t.type}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${t.text} font-medium`}>
                      {t.emoji} {t.label}
                    </span>
                    <span className="text-slate-700">
                      {formatMin(min)}
                      {diff !== 0 && (
                        <span
                          className={cn(
                            "ml-2 text-[10px]",
                            diff > 0 ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatMin(Math.abs(diff))}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={t.dot}
                      style={{ width: `${pct}%`, height: "100%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 曜日別積み上げ */}
        <section className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-1">
            曜日別の時間配分
          </h3>
          <p className="text-xs text-muted mb-4">
            タイプ別に積み上げ表示します。
          </p>
          <DayStack days={days} boxes={weekBoxes} />
        </section>

        {/* 予定と実績のズレ */}
        <section className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-1">
            予定と実績のズレ
          </h3>
          <p className="text-xs text-muted mb-4">
            完了済みボックスの「実績時間 − 予定時間」の合計：
            <span
              className={cn(
                "ml-1 font-semibold",
                plannedActualDiff > 0 ? "text-rose-600" : "text-emerald-600",
              )}
            >
              {plannedActualDiff > 0 ? "+" : ""}
              {plannedActualDiff}分
            </span>
          </p>
          <div className="text-xs text-muted">
            ※ 完了時に実績時間が記録されたボックスのみが対象です。
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  diff,
}: {
  label: string;
  value: string;
  diff?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {diff !== undefined && diff !== 0 && (
        <div
          className={cn(
            "mt-1 text-[11px] font-medium",
            diff > 0 ? "text-emerald-600" : "text-rose-600",
          )}
        >
          前週比 {diff > 0 ? "+" : ""}
          {formatMin(Math.abs(diff))}
        </div>
      )}
    </div>
  );
}

function DayStack({ days, boxes }: { days: Date[]; boxes: Box[] }) {
  const max = Math.max(
    1,
    ...days.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      return boxes
        .filter((b) => b.date === ds)
        .reduce(
          (acc, b) => acc + durationMinutes(b.startTime, b.endTime),
          0,
        );
    }),
  );
  return (
    <div className="space-y-2.5">
      {days.map((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const dayBoxes = boxes.filter((b) => b.date === ds);
        const total = dayBoxes.reduce(
          (acc, b) => acc + durationMinutes(b.startTime, b.endTime),
          0,
        );
        const segs = BOX_TYPES.map((t) => {
          const min = dayBoxes
            .filter((b) => b.type === t.type)
            .reduce(
              (acc, b) => acc + durationMinutes(b.startTime, b.endTime),
              0,
            );
          return { meta: t, min };
        }).filter((s) => s.min > 0);
        return (
          <div key={ds}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">
                {format(d, "M/d (EEE)")}
              </span>
              <span className="text-muted">{formatMin(total)}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {segs.map((s) => {
                const w = (s.min / max) * 100;
                return (
                  <div
                    key={s.meta.type}
                    className={s.meta.dot}
                    style={{ width: `${w}%` }}
                    title={`${s.meta.label}: ${formatMin(s.min)}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}
