import type { Box, RepeatRule } from "@/lib/types";
import { canHostPoolPlacements } from "@/lib/poolLink";
import {
  getRepeatPlacementDates,
  isMultiDateRepeatRule,
} from "@/lib/repeatPlacements";

/** マスターの繰り返しに対し、週間配置が不足していれば true（時刻の一致は要求しない） */
export function needsRepeatReconcile(
  boxes: Box[],
  master: Box,
  anchor: Date,
): boolean {
  if (!canHostPoolPlacements(master)) return false;
  const repeatRule = master.repeatRule ?? "none";
  if (!isMultiDateRepeatRule(repeatRule)) return false;

  const expectedDates = getRepeatPlacementDates(repeatRule, {
    anchor,
    startDateIso: master.date,
  });
  const linked = boxes.filter(
    (b) => b.poolSourceId === master.id && b.status !== "deleted",
  );

  const linkedDates = new Set(linked.map((b) => b.date));
  for (const dateIso of expectedDates) {
    if (!linkedDates.has(dateIso)) return true;
  }

  return false;
}

export type RepeatReconcileParams = {
  repeatRule: RepeatRule;
  anchorDate: Date;
  startDateIso: string;
  startTime: string;
  endTime: string;
};
