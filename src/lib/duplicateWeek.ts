import { addDays, isWithinInterval, parseISO } from "date-fns";
import type { Box, WeekPlannerNotes } from "@/lib/types";
import { reflectionCellKey } from "@/lib/reflectionCell";
import { toISODate, weekEnd, weekStart } from "@/lib/date";
import { isPoolMaster } from "@/lib/poolLink";

function shiftDateIso(dateIso: string, days: number): string {
  return toISODate(addDays(parseISO(dateIso), days));
}

export function shiftWeekPlannerNotes(
  planner: WeekPlannerNotes,
  dayOffset: number,
): WeekPlannerNotes {
  const newWeekStart = shiftDateIso(planner.weekStart, dayOffset);
  const dailyPriority: Record<string, string> = {};
  for (const [d, text] of Object.entries(planner.dailyPriority ?? {})) {
    if (text.trim()) dailyPriority[shiftDateIso(d, dayOffset)] = text;
  }
  const realReflection: Record<string, string> = {};
  for (const [key, text] of Object.entries(planner.realReflection ?? {})) {
    const parts = key.split("|");
    if (parts.length !== 3 || !text.trim()) continue;
    const [date, start, end] = parts;
    realReflection[reflectionCellKey(shiftDateIso(date, dayOffset), start, end)] =
      text;
  }
  return {
    weekStart: newWeekStart,
    weeklyPriority: planner.weeklyPriority,
    microSuccess: planner.microSuccess,
    weeklyEvaluation: planner.weeklyEvaluation,
    dailyPriority,
    realReflection,
  };
}

/** 週間グリッドに載るボックス（プールマスター・削除済み除く） */
export function collectWeekScheduleBoxes(
  boxes: Box[],
  anchorDate: Date,
): Box[] {
  const start = weekStart(anchorDate);
  const end = weekEnd(anchorDate);
  return boxes.filter((b) => {
    if (b.isPooled || b.status === "deleted") return false;
    return isWithinInterval(parseISO(b.date), { start, end });
  });
}

export function duplicateWeekBoxPayload(
  b: Box,
  dayOffset: number,
): Omit<Box, "id" | "createdAt" | "updatedAt"> {
  return {
    ...b,
    date: shiftDateIso(b.date, dayOffset),
    status: "notStarted",
    completion: undefined,
    startedAt: undefined,
    pausedAt: undefined,
    completedAt: undefined,
    actualDuration: undefined,
    googleEventId: undefined,
    googleCalendarId: undefined,
    manuallyEdited: undefined,
  };
}

export function shouldSkipWeekDuplicate(b: Box, allBoxes?: Box[]): boolean {
  if (isPoolMaster(b)) return true;
  // 週スコープ付きプールマスターから派生した連動コピーは複製しない
  if (b.poolSourceId && allBoxes) {
    const master = allBoxes.find((m) => m.id === b.poolSourceId);
    if (master?.poolWeekStart) return true;
  }
  return false;
}
