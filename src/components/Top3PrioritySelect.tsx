"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { Box } from "@/lib/types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import {
  getTop3SlotBox,
  listPoolPriorityMasters,
} from "@/lib/priorityRules";
import { cn } from "@/lib/cn";

interface Props {
  dateIso: string;
  slotIndex: number;
  className?: string;
}

/** Top3 行右端：矢印のみ表示。開いたときに候補タイトルを表示 */
export function Top3PrioritySelect({
  dateIso,
  slotIndex,
  className,
}: Props) {
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const placeBoxInTop3 = useTimeCraftStore((s) => s.placeBoxInTop3);
  const clearTop3Slot = useTimeCraftStore((s) => s.clearTop3Slot);

  const slotBox = useMemo(
    () => getTop3SlotBox(allBoxes, dateIso, slotIndex),
    [allBoxes, dateIso, slotIndex],
  );

  const candidates = useMemo(
    () => listPoolPriorityMasters(allBoxes),
    [allBoxes],
  );

  const selectValue = slotBox?.poolSourceId ?? slotBox?.id ?? "";
  const assignedTitle = slotBox?.title ?? "";

  return (
    <div
      className={cn(
        "relative shrink-0 w-[18px] h-[18px] flex items-center justify-center",
        className,
      )}
      title={
        assignedTitle
          ? `割り当て: ${assignedTitle}（クリックで変更）`
          : "やることリストの優先を割り当て"
      }
    >
      <select
        aria-label={`Top${slotIndex + 1} 優先タスクを選択`}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            clearTop3Slot(dateIso, slotIndex);
            return;
          }
          placeBoxInTop3(v, dateIso, slotIndex);
        }}
        className={cn(
          "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",
          "appearance-none",
        )}
      >
        <option value="">（未割り当て）</option>
        {candidates.map((m: Box) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={2.5}
        className="pointer-events-none text-slate-400 group-hover/top3:text-indigo-500"
        aria-hidden
      />
    </div>
  );
}
