"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Flame,
  Plus,
  Sparkles,
} from "lucide-react";
import { format, isWithinInterval } from "date-fns";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { BoxListItem } from "@/components/BoxListItem";
import { BoxFormDialog } from "@/components/BoxFormDialog";
import { WarningBanner } from "@/components/WarningBanner";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { toMinutes } from "@/lib/timeBlocks";
import { aggregateByType, diagnoseDay } from "@/lib/diagnose";
import { weekStart, weekEnd } from "@/lib/date";
import type { Box } from "@/lib/types";
import { BOX_TYPES } from "@/lib/boxTypes";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <DashboardPage />
    </HydrationGate>
  );
}

function DashboardPage() {
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);
  const today = format(new Date(), "yyyy-MM-dd");

  const todayBoxes = useMemo(
    () =>
      allBoxes
        .filter(
          (b) => !b.isPooled && b.date === today && b.status !== "deleted",
        )
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [allBoxes, today],
  );

  const priorityBoxes = todayBoxes.filter((b) => b.type === "priority");
  const completedToday = todayBoxes.filter(
    (b) => b.status === "completed",
  ).length;

  const weekBoxes = useMemo(() => {
    const s = weekStart(new Date());
    const e = weekEnd(new Date());
    return allBoxes.filter(
      (b) => !b.isPooled && isWithinInterval(new Date(b.date), { start: s, end: e }),
    );
  }, [allBoxes]);

  const weekTotals = useMemo(() => aggregateByType(weekBoxes), [weekBoxes]);
  const diagnosis = useMemo(() => diagnoseDay(todayBoxes), [todayBoxes]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="ダッシュボード"
        description={`${format(new Date(), "yyyy年M月d日 (EEEE)")} ・ 今日と今週のサマリー`}
        right={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            ボックスを追加
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={<Flame size={16} />}
          label="今日の優先ボックス"
          value={`${priorityBoxes.length} / 3`}
          tone="rose"
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="今日完了したボックス"
          value={`${completedToday} 個`}
          tone="indigo"
        />
        <KpiCard
          icon={<Sparkles size={16} />}
          label="今週の資産時間"
          value={`${formatMin(weekTotals.asset)}`}
          tone="amber"
        />
        <KpiCard
          icon={<CalendarRange size={16} />}
          label="今週の余白時間"
          value={`${formatMin(weekTotals.whitespace)}`}
          tone="sky"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WarningBanner diagnosis={diagnosis} />

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                🔥 今日の優先ボックス
              </h2>
              <Link
                href="/today"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                今日ビューを開く <ArrowRight size={12} />
              </Link>
            </div>
            {priorityBoxes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-muted mb-3">
                  今日やるべき最重要タスクを2〜3個だけ選びましょう。
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  優先ボックスを追加
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {priorityBoxes.map((b) => (
                  <BoxListItem key={b.id} box={b} onEdit={setEditingBox} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                今日のスケジュール
              </h2>
              <Link
                href="/"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                週間スケジュール <ArrowRight size={12} />
              </Link>
            </div>
            {todayBoxes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm text-muted">
                  まだ今日の予定はありません。
                  <br />
                  週間画面で Vision 列にボックスを置きましょう。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBoxes.map((b) => (
                  <BoxListItem key={b.id} box={b} onEdit={setEditingBox} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <PhilosophyCard />
          <section className="rounded-2xl border border-border bg-white p-5">
            <h3 className="font-semibold text-slate-900 mb-3">今週の時間配分</h3>
            <div className="space-y-2">
              {BOX_TYPES.map((t) => {
                const min = weekTotals[t.type];
                const max = 60 * 24 * 7;
                const pct = Math.min(100, (min / max) * 100);
                return (
                  <div key={t.type}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${t.text} font-medium`}>
                        {t.emoji} {t.shortLabel}
                      </span>
                      <span className="text-muted">{formatMin(min)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={t.dot} style={{ width: `${pct}%`, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/analytics"
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              詳細な分析を見る <ArrowRight size={12} />
            </Link>
          </section>
        </aside>
      </div>

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

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "rose" | "indigo" | "amber" | "sky";
}) {
  const map = {
    rose: "from-rose-50 to-rose-100 text-rose-700",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700",
    amber: "from-amber-50 to-amber-100 text-amber-700",
    sky: "from-sky-50 to-sky-100 text-sky-700",
  };
  return (
    <div
      className={`rounded-xl border border-border bg-gradient-to-br ${map[tone]} p-4`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
    </div>
  );
}

function PhilosophyCard() {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-5">
      <div className="text-xs opacity-70 mb-1">TIMECRAFT</div>
      <h3 className="text-base font-bold leading-snug">
        時間を管理するのではなく、
        <br />
        時間をつくる。
      </h3>
      <p className="mt-2 text-xs opacity-80 leading-relaxed">
        Vision に計画、Real に実績。手帳のように週を設計しましょう。
      </p>
    </section>
  );
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}
