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

/** 週間 Vision グリッド（時間軸）に置いてよいか — 全種類共通で可（Top3 行は別 UI） */
export function canPlacePriorityOnVisionGrid(_box: Box): boolean {
  return true;
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
