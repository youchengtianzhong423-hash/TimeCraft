import type { WeekPlannerNotes } from "@/lib/types";
import { normalizeReflectionText } from "@/lib/reflectionCell";

const MARKER_PREFIX = "timecraft-export";

export function upsertMarkedSection(
  existing: string,
  markerId: string,
  body: string,
): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) return existing;

  const start = `<!-- ${MARKER_PREFIX}:${markerId} -->`;
  const end = `<!-- /${MARKER_PREFIX}:${markerId} -->`;
  const block = `\n\n${start}\n${trimmedBody}\n${end}\n`;
  const escaped = markerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `\\n?<!-- ${MARKER_PREFIX}:${escaped} -->[\\s\\S]*?<!-- /${MARKER_PREFIX}:${escaped} -->`,
    "m",
  );

  const base = existing.trimEnd();
  if (re.test(existing)) {
    return existing.replace(re, block).trimEnd() + "\n";
  }
  if (!base) {
    return `${start}\n${trimmedBody}\n${end}\n`;
  }
  return `${base}${block}`;
}

export function buildDailyReflectionSection(
  dateIso: string,
  realReflection: Record<string, string>,
): string {
  const rows = Object.entries(realReflection)
    .filter(([key]) => key.startsWith(`${dateIso}|`))
    .map(([key, raw]) => {
      const parts = key.split("|");
      const start = parts[1] ?? "";
      const end = parts[2] ?? "";
      const text = normalizeReflectionText(raw).trim();
      return { start, end, text };
    })
    .filter((r) => r.text.length > 0)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (rows.length === 0) return "";

  const lines = [
    "## TimeCraft - Real振り返り",
    "",
    ...rows.map((r) => `- **${r.start}-${r.end}** ${r.text}`),
  ];
  return lines.join("\n");
}

export function buildWeeklyPlannerSection(planner: WeekPlannerNotes): string {
  const blocks: string[] = ["## TimeCraft - 週間メモ", ""];

  const reflectionParts: string[] = [];
  if (planner.weeklyEvaluation.trim()) {
    reflectionParts.push(planner.weeklyEvaluation.trim());
  }
  if (planner.weeklyPriority.trim()) {
    reflectionParts.push(`### Weekly Priority\n${planner.weeklyPriority.trim()}`);
  }
  if (planner.microSuccess.trim()) {
    reflectionParts.push(`### Micro Success\n${planner.microSuccess.trim()}`);
  }
  if (reflectionParts.length > 0) {
    blocks.push("### 今週の振り返り", "", reflectionParts.join("\n\n"), "");
  }

  if (blocks.length <= 2) return "";
  return blocks.join("\n").trimEnd();
}

export interface DayExportResult {
  date: string;
  path: string;
  updated: boolean;
  skipped: boolean;
  reason?: string;
}

export interface WeekExportPlan {
  weekStart: string;
  sundayDate: string;
  days: DayExportResult[];
  weekly: { date: string; path: string; updated: boolean; skipped: boolean };
}
