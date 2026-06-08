"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTimeCraftStore, useWeekPlanner } from "@/store/useTimeCraftStore";
import { weekDays } from "@/lib/date";
import { cn } from "@/lib/cn";
import { PoolPanel } from "@/components/PoolPanel";
import { ObsidianWeekExportButton } from "@/components/ObsidianWeekExportButton";

interface Props {
  anchorDate: Date;
  className?: string;
}

export function PlannerSidebar({ anchorDate, className }: Props) {
  const planner = useWeekPlanner(anchorDate);
  const updateWeekPlanner = useTimeCraftStore((s) => s.updateWeekPlanner);
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const days = weekDays(anchorDate);

  const poolBoxes = useMemo(
    () =>
      allBoxes.filter(
        (b) => b.isPooled && !b.poolSourceId && b.status !== "deleted",
      ),
    [allBoxes],
  );

  const fieldClass =
    "w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 min-h-[72px] resize-y";

  return (
    <aside
      className={cn(
        "w-[11rem] sm:w-48 md:w-52 shrink-0 flex flex-col gap-3 text-xs max-h-[calc(100vh-5rem)]",
        className,
      )}
    >
      <p className="text-sm font-semibold text-slate-800 leading-snug px-0.5 shrink-0">
        {format(days[0], "yyyy年M月d日")} 〜 {format(days[6], "M月d日")}
      </p>

      <PoolPanel
        boxes={poolBoxes}
        weekAnchor={anchorDate}
        vertical
        className="shrink-0 w-full"
      />

      <div className="shrink-0 space-y-3">
      <Section title="今週の振り返り">
        <textarea
          className={`${fieldClass} min-h-[120px]`}
          placeholder="今週の振り返り・うまくいったこと・来週へのメモ"
          value={planner.weeklyEvaluation}
          onChange={(e) =>
            updateWeekPlanner(anchorDate, { weeklyEvaluation: e.target.value })
          }
        />
      </Section>

      <ObsidianWeekExportButton anchorDate={anchorDate} className="px-0.5" />

      <p className="text-[10px] text-muted leading-relaxed px-0.5">
        各曜日の Daily Priority は週間グリッドの日付下に入力できます。
      </p>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-2.5">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}
