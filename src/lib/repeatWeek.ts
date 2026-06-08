import { addDays, isBefore, startOfDay } from "date-fns";
import { toISODate, weekEnd, weekStart } from "@/lib/date";

/**
 * 表示中の週のうち「今日以降」の ISO 日付一覧（月曜〜日曜の範囲内）。
 * 今日が週より前なら週の全日、今日が週より後なら空配列。
 */
export function getRemainingWeekDates(anchor: Date): string[] {
  const start = startOfDay(weekStart(anchor));
  const end = startOfDay(weekEnd(anchor));
  const today = startOfDay(new Date());
  const rangeStart = isBefore(today, start) ? start : today;
  if (isBefore(end, rangeStart)) return [];

  const out: string[] = [];
  for (let d = rangeStart; !isBefore(end, d); d = addDays(d, 1)) {
    out.push(toISODate(d));
  }
  return out;
}

/** やることリスト用の仮日時（スケジュール未反映時） */
export const POOL_PLACEHOLDER = {
  date: () => toISODate(new Date()),
  startTime: "08:00",
  endTime: "09:00",
  plannedDuration: 60,
} as const;
