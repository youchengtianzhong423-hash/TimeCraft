import {
  addDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

/** ローカルタイム基準の日付キー (yyyy-MM-dd) */
export const getLocalDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Date -> yyyy-MM-dd（ローカル日付） */
export const toISODate = (d: Date): string => getLocalDateKey(d);

/** yyyy-MM-dd -> Date (ローカルタイム0:00) */
export const fromISODate = (s: string): Date => parseISO(s);

/** 週の月曜日 (週開始) */
export const weekStart = (d: Date): Date => startOfWeek(d, { weekStartsOn: 1 });

/** 週の日曜日 */
export const weekEnd = (d: Date): Date => endOfWeek(d, { weekStartsOn: 1 });

/** 月曜始まりで7日分の Date 配列 */
export const weekDays = (anchor: Date): Date[] => {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const formatDayLabel = (d: Date): string => format(d, "M/d (EEE)");
export const formatShortDay = (d: Date): string => format(d, "EEE");
export const formatDay = (d: Date): string => format(d, "d");
