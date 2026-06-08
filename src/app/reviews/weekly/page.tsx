"use client";

import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FieldRow, Input, Textarea } from "@/components/ui/Field";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { aggregateByType } from "@/lib/diagnose";
import { toISODate, weekEnd, weekStart } from "@/lib/date";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <WeeklyReviewPage />
    </HydrationGate>
  );
}

function WeeklyReviewPage() {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const start = weekStart(anchor);
  const end = weekEnd(anchor);
  const startIso = toISODate(start);
  const endIso = toISODate(end);

  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const upsert = useTimeCraftStore((s) => s.upsertWeeklyReview);
  const existing = useTimeCraftStore((s) =>
    s.weeklyReviews.find((r) => r.weekStartDate === startIso),
  );

  const weekBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) => !b.isPooled && isWithinInterval(new Date(b.date), { start, end }),
      ),
    [allBoxes, start, end],
  );
  const totals = useMemo(() => aggregateByType(weekBoxes), [weekBoxes]);

  const [form, setForm] = useState({
    bestBox: "",
    improvementBox: "",
    reduceNextWeek: "",
    increaseNextWeek: "",
    nextWeekPriority: "",
    memo: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
    if (existing) {
      setForm({
        bestBox: existing.bestBox ?? "",
        improvementBox: existing.improvementBox ?? "",
        reduceNextWeek: existing.reduceNextWeek ?? "",
        increaseNextWeek: existing.increaseNextWeek ?? "",
        nextWeekPriority: existing.nextWeekPriority ?? "",
        memo: existing.memo ?? "",
      });
    } else {
      setForm({
        bestBox: "",
        improvementBox: "",
        reduceNextWeek: "",
        increaseNextWeek: "",
        nextWeekPriority: "",
        memo: "",
      });
    }
  }, [existing?.id]);

  const handleSave = () => {
    upsert({
      weekStartDate: startIso,
      weekEndDate: endIso,
      assetTime: totals.asset,
      whitespaceTime: totals.whitespace,
      shallowWorkTime: totals.shallowWork,
      recoveryTime: totals.recovery,
      bestBox: form.bestBox,
      improvementBox: form.improvementBox,
      reduceNextWeek: form.reduceNextWeek,
      increaseNextWeek: form.increaseNextWeek,
      nextWeekPriority: form.nextWeekPriority,
      memo: form.memo,
    });
    setSaved(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="週次レビュー"
        description="この1週間の時間設計を振り返り、来週の予定に改善を反映します。"
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="資産時間" minutes={totals.asset} tone="amber" />
        <Stat label="余白時間" minutes={totals.whitespace} tone="sky" />
        <Stat label="雑務時間" minutes={totals.shallowWork} tone="zinc" />
        <Stat label="回復時間" minutes={totals.recovery} tone="emerald" />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
        <FieldRow label="一番良かったボックス">
          <Input
            placeholder="例：火曜午前のYouTube企画作成"
            value={form.bestBox}
            onChange={(e) => setForm({ ...form, bestBox: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="一番改善したいボックス">
          <Input
            placeholder="例：夜の学習ボックスが未完了続き"
            value={form.improvementBox}
            onChange={(e) =>
              setForm({ ...form, improvementBox: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="来週減らすこと">
          <Textarea
            value={form.reduceNextWeek}
            onChange={(e) =>
              setForm({ ...form, reduceNextWeek: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="来週増やすこと">
          <Textarea
            value={form.increaseNextWeek}
            onChange={(e) =>
              setForm({ ...form, increaseNextWeek: e.target.value })
            }
          />
        </FieldRow>
        <FieldRow label="来週の最優先テーマ">
          <Input
            placeholder="例：チャンネル登録1000人 / 開発リリース"
            value={form.nextWeekPriority}
            onChange={(e) =>
              setForm({ ...form, nextWeekPriority: e.target.value })
            }
          />
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
  tone: "amber" | "sky" | "emerald" | "zinc";
}) {
  const map = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    zinc: "bg-zinc-50 border-zinc-200 text-zinc-700",
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
