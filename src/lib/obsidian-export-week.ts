import { addDays, parseISO } from "date-fns";
import type { WeekPlannerNotes } from "@/lib/types";
import { toISODate } from "@/lib/date";
import {
  buildDailyReflectionSection,
  buildWeeklyPlannerSection,
  upsertMarkedSection,
  type DayExportResult,
  type WeekExportPlan,
} from "@/lib/obsidian-export";
import { saveDailyNoteWithMarker } from "@/lib/obsidian-server";

export async function exportWeekPlannerToObsidian(
  planner: WeekPlannerNotes,
): Promise<WeekExportPlan> {
  const weekStart = planner.weekStart;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error("weekStart が不正です。");
  }

  const startDate = parseISO(weekStart);
  const days: DayExportResult[] = [];

  for (let i = 0; i < 7; i++) {
    const dateIso = toISODate(addDays(startDate, i));
    const section = buildDailyReflectionSection(
      dateIso,
      planner.realReflection ?? {},
    );

    if (!section) {
      days.push({
        date: dateIso,
        path: `raw/02_Daily/${dateIso}.md`,
        updated: false,
        skipped: true,
        reason: "振り返りメモなし",
      });
      continue;
    }

    const markerId = `real-reflection:${dateIso}`;
    const { path, updated } = await saveDailyNoteWithMarker(
      dateIso,
      markerId,
      section,
      upsertMarkedSection,
    );

    days.push({
      date: dateIso,
      path,
      updated,
      skipped: !updated,
    });
  }

  const sundayDate = toISODate(addDays(startDate, 6));
  const weeklySection = buildWeeklyPlannerSection(planner);
  let weeklyResult: WeekExportPlan["weekly"] = {
    date: sundayDate,
    path: `raw/02_Daily/${sundayDate}.md`,
    updated: false,
    skipped: true,
  };

  if (weeklySection) {
    const { path, updated } = await saveDailyNoteWithMarker(
      sundayDate,
      `week-planner:${weekStart}`,
      weeklySection,
      upsertMarkedSection,
    );
    weeklyResult = { date: sundayDate, path, updated, skipped: !updated };
  }

  return { weekStart, sundayDate, days, weekly: weeklyResult };
}
