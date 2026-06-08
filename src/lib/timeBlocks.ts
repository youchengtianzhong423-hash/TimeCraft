export interface TimeBlock {
  /** "HH:mm" 開始（24:00 以降も "25:00" 等で表現） */
  start: string;
  end: string;
  /** 表示ラベル（0:00〜23:00 の範囲で循環） */
  label: string;
}

export const PLANNER_BLOCK_COUNT = 18;
export const DEFAULT_SCHEDULE_START_HOUR = 6;

const pad = (n: number) => String(n).padStart(2, "0");

/** スケジュール表示ブロックを動的生成（startHour から 18 時間分） */
export function buildPlannerHourBlocks(startHour: number): TimeBlock[] {
  return Array.from({ length: PLANNER_BLOCK_COUNT }, (_, i) => {
    const h = startHour + i;
    return {
      start: `${pad(h)}:00`,
      end: `${pad(h + 1)}:00`,
      label: `${h % 24}:00`,
    };
  });
}

/** 手帳風週間ビュー用（デフォルト 6:00〜24:00・1時間刻み） */
export const PLANNER_HOUR_BLOCKS: TimeBlock[] = buildPlannerHourBlocks(DEFAULT_SCHEDULE_START_HOUR);

export const TIME_BLOCKS: TimeBlock[] = [
  { start: "06:00", end: "08:00", label: "6:00 - 8:00" },
  { start: "08:00", end: "10:00", label: "8:00 - 10:00" },
  { start: "10:00", end: "12:00", label: "10:00 - 12:00" },
  { start: "12:00", end: "14:00", label: "12:00 - 14:00" },
  { start: "14:00", end: "16:00", label: "14:00 - 16:00" },
  { start: "16:00", end: "18:00", label: "16:00 - 18:00" },
  { start: "18:00", end: "20:00", label: "18:00 - 20:00" },
  { start: "20:00", end: "22:00", label: "20:00 - 22:00" },
  { start: "22:00", end: "24:00", label: "22:00 - 24:00" },
];

/** "HH:mm" を分に変換（24:00 = 1440） */
export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** 週間グリッド左端〜右端（ボックス配置の基準タイムライン） */
export const PLANNER_DAY_START_MIN = toMinutes(PLANNER_HOUR_BLOCKS[0].start);
export const PLANNER_DAY_END_MIN = toMinutes(
  PLANNER_HOUR_BLOCKS[PLANNER_HOUR_BLOCKS.length - 1].end,
);
export const PLANNER_DAY_DURATION_MIN =
  PLANNER_DAY_END_MIN - PLANNER_DAY_START_MIN;

/** ボックスがグリッド表示範囲と重なるか（動的な範囲を渡せる） */
export const overlapsPlannerDay = (
  startTime: string,
  endTime: string,
  startMin = PLANNER_DAY_START_MIN,
  endMin = PLANNER_DAY_END_MIN,
): boolean => {
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  return e > startMin && s < endMin;
};

/** 2 つの時間範囲が重なるか */
export const isOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean => {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
};

/** 分数を計算（end - start）。end が start より小さい場合は 0。 */
export const durationMinutes = (start: string, end: string): number => {
  const d = toMinutes(end) - toMinutes(start);
  return d > 0 ? d : 0;
};

/** 分 → "HH:mm"（24:00 まで） */
export const minutesToHHmm = (totalMin: number): string => {
  const clamped = Math.min(Math.max(0, totalMin), 24 * 60);
  if (clamped >= 24 * 60) return "24:00";
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** スケジュール上の長さ調整用（15分刻み） */
export const snapScheduleMinutes = (min: number, step = 15): number =>
  Math.round(min / step) * step;
