import type { Box } from "@/lib/types";

/** Top3 行専用（5:00 グリッドより前の仮スロット時刻） */
export const TOP3_SLOTS = [
  { start: "04:00", end: "04:14" },
  { start: "04:15", end: "04:29" },
  { start: "04:30", end: "04:44" },
] as const;

export function top3DropId(date: string, slotIndex: number): string {
  return `top3|${date}|${slotIndex}`;
}

export function parseTop3DropId(
  overId: string,
): { date: string; slotIndex: number } | null {
  if (!overId.startsWith("top3|")) return null;
  const [, date, slotStr] = overId.split("|");
  const slotIndex = Number.parseInt(slotStr ?? "", 10);
  if (!date || slotIndex < 0 || slotIndex > 2) return null;
  return { date, slotIndex };
}

export function getTop3SlotTimes(slotIndex: number) {
  return TOP3_SLOTS[slotIndex] ?? TOP3_SLOTS[0];
}

export function isTop3StartTime(startTime: string): boolean {
  return TOP3_SLOTS.some((s) => s.start === startTime);
}

export function findBoxInTop3Slot(
  boxes: Box[],
  date: string,
  slotIndex: number,
): Box | undefined {
  const slot = TOP3_SLOTS[slotIndex];
  if (!slot) return undefined;
  return boxes.find(
    (b) =>
      b.date === date &&
      b.startTime === slot.start &&
      !b.isPooled &&
      b.status !== "deleted",
  );
}
