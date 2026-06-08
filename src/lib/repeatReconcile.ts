import type { Box, RepeatRule } from "@/lib/types";
import { canHostPoolPlacements } from "@/lib/poolLink";
import {
  getRepeatPlacementDates,
  isMultiDateRepeatRule,
} from "@/lib/repeatPlacements";

/** マスターの繰り返しに対し、週間配置が不足・ずれていれば true */
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

  if (linked.length !== expectedDates.length) return true;

  const linkedByDate = new Map(linked.map((b) => [b.date, b]));
  for (const dateIso of expectedDates) {
    const p = linkedByDate.get(dateIso);
    if (!p) return true;
    if (
      p.startTime !== master.startTime ||
      p.endTime !== master.endTime
    ) {
      return true;
    }
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
