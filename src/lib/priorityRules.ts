import type { Box } from "@/lib/types";
import { isPoolMaster } from "@/lib/poolLink";
import { findBoxInTop3Slot, isTop3StartTime } from "@/lib/top3";

/** やることリストの優先マスター（件数無制限） */
export function listPoolPriorityMasters(boxes: Box[]): Box[] {
  return boxes.filter(
    (b) =>
      isPoolMaster(b) &&
      b.type === "priority" &&
      b.status !== "deleted",
  );
}

/** 週間 Vision グリッド（時間軸）に置いてよい優先ボックスか — Top3 のみ可 */
export function canPlacePriorityOnVisionGrid(box: Box): boolean {
  if (box.type !== "priority") return true;
  if (box.isPooled) return false;
  if (isTop3StartTime(box.startTime)) return false;
  return false;
}

export function isPriorityPoolMaster(box: Box): boolean {
  return isPoolMaster(box) && box.type === "priority";
}

/** Top3 スロットへドロップ可能か */
export function canDropBoxOntoTop3(
  box: Box,
  allBoxes: Box[],
): boolean {
  if (isPoolMaster(box)) return box.type === "priority";
  if (box.poolSourceId) {
    const master = allBoxes.find((b) => b.id === box.poolSourceId);
    return master?.type === "priority";
  }
  return box.type === "priority";
}

export function getTop3SlotBox(
  boxes: Box[],
  date: string,
  slotIndex: number,
): Box | undefined {
  return findBoxInTop3Slot(boxes, date, slotIndex);
}
