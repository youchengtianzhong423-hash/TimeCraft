"use client";

import { useState } from "react";
import { FileOutput, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useWeekPlanner } from "@/store/useTimeCraftStore";
import { toISODate, weekStart } from "@/lib/date";
import {
  canUseBrowserVaultExport,
  exportWeekPlannerToBrowserVault,
} from "@/lib/obsidian-web-export";
import type { WeekPlannerNotes } from "@/lib/types";

interface Props {
  anchorDate: Date;
  className?: string;
}

function isLocalApp() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function exportSummaryMessage(summary: {
  wroteDays: number;
  skippedDays: number;
  weeklyWritten: boolean;
  sundayFile: string;
}) {
  return (
    `書き出し完了: 振り返り ${summary.wroteDays}日分` +
    (summary.skippedDays ? ` / 空欄 ${summary.skippedDays}日` : "") +
    (summary.weeklyWritten
      ? ` / 週間メモ → ${summary.sundayFile}`
      : " / 週間メモは空欄のためスキップ")
  );
}

function normalizePlanner(planner: WeekPlannerNotes, anchorDate: Date) {
  const ws = toISODate(weekStart(anchorDate));
  return { ...planner, weekStart: planner.weekStart || ws };
}

export function ObsidianWeekExportButton({ anchorDate, className }: Props) {
  const planner = useWeekPlanner(anchorDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLocalExport = async (normalizedPlanner: WeekPlannerNotes) => {
    const res = await fetch("/api/obsidian/export-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planner: normalizedPlanner }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "書き出しに失敗しました。");
    }

    const s = data.summary as {
      wroteDays: number;
      skippedDays: number;
      weeklyWritten: boolean;
      sundayFile: string;
    };
    setMessage(exportSummaryMessage(s));
  };

  const handleBrowserExport = async (normalizedPlanner: WeekPlannerNotes) => {
    const result = await exportWeekPlannerToBrowserVault(normalizedPlanner);
    const wroteDays = result.days.filter((d) => d.updated).length;
    const skippedDays = result.days.filter((d) => d.skipped).length;
    setMessage(
      exportSummaryMessage({
        wroteDays,
        skippedDays,
        weeklyWritten: result.weekly.updated,
        sundayFile: result.weekly.path,
      }),
    );
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const normalizedPlanner = normalizePlanner(planner, anchorDate);
      if (isLocalApp()) {
        await handleLocalExport(normalizedPlanner);
      } else if (canUseBrowserVaultExport()) {
        await handleBrowserExport(normalizedPlanner);
      } else {
        throw new Error(
          "Web版から直接保存するにはChromeまたはEdgeで開いてください。",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "書き出しに失敗しました。");
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
        title="Obsidianのraw/02_DailyにMarkdownで追記"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileOutput size={14} />
        )}
        Obsidianに書き出し
      </Button>
      {message && (
        <p className="mt-1.5 text-[10px] text-slate-600 leading-snug max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
}
