"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FieldRow, Input, Textarea } from "@/components/ui/Field";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { aggregateByType } from "@/lib/diagnose";
import { cn } from "@/lib/cn";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <DailyReviewPage />
    </HydrationGate>
  );
}

function DailyReviewPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const upsert = useTimeCraftStore((s) => s.upsertDailyReview);
  const existing = useTimeCraftStore((s) =>
    s.dailyReviews.find((r) => r.date === date),
  );

  const dayBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) => !b.isPooled && b.date === date && b.status !== "deleted",
      ),
    [allBoxes, date],
  );
  const totals = useMemo(() => aggregateByType(dayBoxes), [dayBoxes]);

  const [form, setForm] = useState({
    completedTasks: "",
    unfinishedTasks: "",
    goodPoints: "",
    improvementPoints: "",
    satisfactionScore: 3,
    memo: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
    if (existing) {
      setForm({
        completedTasks: existing.completedTasks,
        unfinishedTasks: existing.unfinishedTasks,
        goodPoints: existing.goodPoints,
        improvementPoints: existing.improvementPoints,
        satisfactionScore: existing.satisfactionScore,
        memo: existing.memo ?? "",
      });
    } else {
      const completedTitles = dayBoxes
        .filter((b) => b.status === "completed")
        .map((b) => `・${b.title}`)
        .join("\n");
      const unfinishedTitles = dayBoxes
        .filter((b) => b.status !== "completed")
        .map((b) => `・${b.title}`)
        .join("\n");
      setForm({
        completedTasks: completedTitles,
        unfinishedTasks: unfinishedTitles,
        goodPoints: "",
        improvementPoints: "",
        satisfactionScore: 3,
        memo: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const handleSave = () => {
    upsert({
      date,
      completedTasks: form.completedTasks,
      unfinishedTasks: form.unfinishedTasks,
      goodPoints: form.goodPoints,
      improvementPoints: form.improvementPoints,
      satisfactionScore: form.satisfactionScore,
      assetTime: totals.asset,
      whitespaceTime: totals.whitespace,
      recoveryTime: totals.recovery,
      memo: form.memo,
    });
    setSaved(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="日次レビュー"
        description="今日の時間の使い方を1分だけ振り返ります。"
        right={
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="資産時間" minutes={totals.asset} tone="amber" />
        <Stat label="余白時間" minutes={totals.whitespace} tone="sky" />
        <Stat label="回復時間" minutes={totals.recovery} tone="emerald" />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
        <FieldRow label="今日できたこと">
          <Textarea
            value={form.completedTasks}
            onChange={(e) =>
              setForm({ ...form, completedTasks: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="できなかったこと">
          <Textarea
            value={form.unfinishedTasks}
            onChange={(e) =>
              setForm({ ...form, unfinishedTasks: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="時間の使い方で良かったこと">
          <Textarea
            value={form.goodPoints}
            onChange={(e) =>
              setForm({ ...form, goodPoints: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="明日改善したいこと">
          <Textarea
            value={form.improvementPoints}
            onChange={(e) =>
              setForm({ ...form, improvementPoints: e.target.value })
            }
          />
        </FieldRow>

        <FieldRow label="今日の満足度">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, satisfactionScore: n })}
                className={cn(
                  "h-10 flex-1 rounded-lg border text-sm font-semibold",
                  form.satisfactionScore >= n
                    ? "bg-amber-100 border-amber-300 text-amber-700"
                    : "bg-white border-slate-200 text-slate-400",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="一言メモ">
          <Textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
          />
        </FieldRow>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          {saved && (
            <span className="text-xs text-emerald-700">保存しました</span>
          )}
          <Button onClick={handleSave}>レビューを保存</Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  minutes,
  tone,
}: {
  label: string;
  minutes: number;
  tone: "amber" | "sky" | "emerald";
}) {
  const map = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border ${map[tone]} p-3`}>
      <div className="text-[11px] font-medium">{label}</div>
      <div className="mt-1 text-xl font-bold">
        {Math.floor(minutes / 60)}h {minutes % 60}m
      </div>
    </div>
  );
}
