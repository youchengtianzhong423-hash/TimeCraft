import type { Box } from "@/lib/types";
import { isTop3StartTime } from "@/lib/top3";
import { isMultiDateRepeatRule } from "@/lib/repeatPlacements";

/**
 * やることリストのマスター（元ネタ1件）。
 * 例:「YouTubeショート」はリストに1行だけ。週間表には poolSourceId で紐づくコピーが並ぶ。
 */
export function isPoolMaster(box: Box): boolean {
  return !!box.isPooled && !box.poolSourceId;
}

/** 週間表へ繰り返し配置できるマスター（旧データで isPooled 未設定でも repeat ありなら可） */
export function canHostPoolPlacements(box: Box): boolean {
  if (box.poolSourceId) return false;
  if (box.isPooled) return true;
  return isMultiDateRepeatRule(box.repeatRule ?? "none");
}

/** マスターから配置された連動コピー（週間スケジュール / Top3）。リストには表示しない。 */
export function isLinkedPlacement(box: Box): boolean {
  return !!box.poolSourceId;
}

export function countLinkedPlacements(boxes: Box[], masterId: string): number {
  return boxes.filter(
    (b) => b.poolSourceId === masterId && b.status !== "deleted",
  ).length;
}

/** 週間グリッド（Vision）への配置のみ。Top3 は含めない */
export function countGridLinkedPlacements(
  boxes: Box[],
  masterId: string,
): number {
  return boxes.filter(
    (b) =>
      b.poolSourceId === masterId &&
      b.status !== "deleted" &&
      !isTop3StartTime(b.startTime),
  ).length;
}
