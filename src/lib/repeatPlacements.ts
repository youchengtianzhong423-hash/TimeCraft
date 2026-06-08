import { addDays, getDay, isBefore, startOfDay } from "date-fns";
import type { RepeatRule } from "@/lib/types";
import { fromISODate, toISODate, weekDays } from "@/lib/date";
import { getRemainingWeekDates } from "@/lib/repeatWeek";

/** 週間グリッドへ配置する繰り返しの先読み週数（Google同期の futureWeeks と同程度） */
export const REPEAT_PLACEMENT_WEEKS = 4;

const placementHorizonEnd = (start: Date): Date =>
  addDays(start, REPEAT_PLACEMENT_WEEKS * 7 - 1);

/** 複数日に展開する繰り返しルールか */
export function isMultiDateRepeatRule(rule: RepeatRule): boolean {
  return (
    rule === "thisWeek" ||
    rule === "daily" ||
    rule === "weekdays" ||
    rule === "weekly"
  );
}

export type RepeatPlacementOptions = {
  /** 表示中の週（今週のみの範囲計算用） */
  anchor: Date;
  /** 繰り返しの起点日（フォームの日付） */
  startDateIso: string;
};

/**
 * 繰り返しルールに応じ、週間表へ placeBoxFromPool する ISO 日付一覧。
 * いずれも startDateIso 以降（起点日を含む）。
 */
export function getRepeatPlacementDates(
  repeatRule: RepeatRule,
  options: RepeatPlacementOptions,
): string[] {
  const { anchor, startDateIso } = options;
  const start = startOfDay(fromISODate(startDateIso));

  switch (repeatRule) {
    case "none":
      return [startDateIso];
    case "thisWeek": {
      const inWeek = getRemainingWeekDates(anchor);
      return inWeek.filter((d) => d >= startDateIso);
    }
    case "daily": {
      const end = placementHorizonEnd(start);
      const dateSet = new Set<string>();
      for (let d = start; !isBefore(end, d); d = addDays(d, 1)) {
        dateSet.add(toISODate(d));
      }
      for (const d of weekDays(anchor)) {
        const iso = toISODate(d);
        if (iso >= startDateIso) dateSet.add(iso);
      }
      return [...dateSet].sort();
    }
    case "weekdays": {
      const end = placementHorizonEnd(start);
      const out: string[] = [];
      for (let d = start; !isBefore(end, d); d = addDays(d, 1)) {
        const dow = getDay(d);
        if (dow >= 1 && dow <= 5) out.push(toISODate(d));
      }
      return out;
    }
    case "weekly": {
      const out: string[] = [];
      for (let i = 0; i < REPEAT_PLACEMENT_WEEKS; i++) {
        out.push(toISODate(addDays(start, i * 7)));
      }
      return out;
    }
    default:
      return [startDateIso];
  }
}
