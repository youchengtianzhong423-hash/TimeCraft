import {
  minutesToHHmm,
  PLANNER_BLOCK_COUNT,
  DEFAULT_SCHEDULE_START_HOUR,
  snapScheduleMinutes,
  toMinutes,
} from "@/lib/timeBlocks";

export const SCHEDULE_SNAP_MIN = 15;

/** 1時間行を4つの15分ドロップ枠に分割 */
export function quarterSlotsForHour(blockStart: string, blockEnd: string) {
  const startMin = toMinutes(blockStart);
  const endMin = toMinutes(blockEnd);
  const slots: { start: string; end: string }[] = [];
  for (let m = startMin; m < endMin; m += SCHEDULE_SNAP_MIN) {
    const e = Math.min(m + SCHEDULE_SNAP_MIN, endMin);
    slots.push({ start: minutesToHHmm(m), end: minutesToHHmm(e) });
  }
  return slots;
}

/** 移動・配置時: 開始を15分刻みにし、長さを保って終了を算出 */
export function snapBoxMoveTimes(
  startTime: string,
  durationMin: number,
  scheduleStartHour = DEFAULT_SCHEDULE_START_HOUR,
): { startTime: string; endTime: string } {
  const scheduleStartMin = scheduleStartHour * 60;
  const scheduleEndMin = Math.min(
    (scheduleStartHour + PLANNER_BLOCK_COUNT) * 60,
    24 * 60,
  );
  const dur = Math.max(SCHEDULE_SNAP_MIN, durationMin);
  let startMin = snapScheduleMinutes(toMinutes(startTime), SCHEDULE_SNAP_MIN);
  startMin = Math.max(scheduleStartMin, Math.min(startMin, scheduleEndMin - dur));
  let endMin = snapScheduleMinutes(startMin + dur, SCHEDULE_SNAP_MIN);
  endMin = Math.min(Math.max(endMin, startMin + SCHEDULE_SNAP_MIN), scheduleEndMin);
  return {
    startTime: minutesToHHmm(startMin),
    endTime: minutesToHHmm(endMin),
  };
}
