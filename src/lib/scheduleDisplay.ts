/** 週間グリッド上のボックス表示密度（時間の長さから決定） */
export type ScheduleDisplayDensity = "minimal" | "compact" | "full";

/** 1時間セル高さ 52px 想定: 〜25分は1行、〜50分はコンパクト2要素、それ以上は通常 */
export function scheduleDisplayDensity(
  durationMin: number,
): ScheduleDisplayDensity {
  const d = Math.max(0, durationMin);
  if (d <= 25) return "minimal";
  if (d <= 50) return "compact";
  return "full";
}
