"use client";

import { useTimeCraftStore, useWeekPlanner } from "@/store/useTimeCraftStore";
import { cn } from "@/lib/cn";

interface Props {
  dateIso: string;
  anchorDate: Date;
  className?: string;
}

export function TodayMemoPanel({ dateIso, anchorDate, className }: Props) {
  const planner = useWeekPlanner(anchorDate);
  const setDailyMemo = useTimeCraftStore((s) => s.setDailyMemo);

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-slate-50/80 p-2.5 text-xs",
        className,
      )}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
        今日のメモ
      </h3>
      <textarea
        className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 min-h-[120px] resize-y"
        placeholder="今日の気づき、あとで思い出したいこと、明日へのメモ"
        value={planner.dailyMemo?.[dateIso] ?? ""}
        onChange={(e) => setDailyMemo(dateIso, e.target.value, anchorDate)}
      />
    </section>
  );
}
