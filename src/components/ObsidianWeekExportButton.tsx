"use client";

import { useState } from "react";
import { FileOutput, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useWeekPlanner } from "@/store/useTimeCraftStore";
import { toISODate, weekStart } from "@/lib/date";

interface Props {
  anchorDate: Date;
  className?: string;
}

export function ObsidianWeekExportButton({ anchorDate, className }: Props) {
  const planner = useWeekPlanner(anchorDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const ws = toISODate(weekStart(anchorDate));
      const res = await fetch("/api/obsidian/export-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planner: { ...planner, weekStart: planner.weekStart || ws },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "書き出しに失敗しました");
      }
      const s = data.summary as {
        wroteDays: number;
        skippedDays: number;
        weeklyWritten: boolean;
        sundayFile: string;
      };
      setMessage(
        `書き出し完了: 振り返り ${s.wroteDays} 日分` +
          (s.skippedDays ? `（スキップ ${s.skippedDays}）` : "") +
          (s.weeklyWritten
            ? ` / 週間メモ → ${s.sundayFile}`
            : " / 週間メモは空のためスキップ"),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        title="Second Brain の raw/02_Daily に Markdown で追記"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileOutput size={14} />
        )}
        Obsidian に書き出し
      </Button>
      {message && (
        <p className="mt-1.5 text-[10px] text-slate-600 leading-snug max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
}
