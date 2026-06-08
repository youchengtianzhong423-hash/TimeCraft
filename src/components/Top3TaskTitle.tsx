"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Box } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  dateIso: string;
  slotIndex: number;
}

/** Top3 行のタイトル（見た目は従来どおり・ドラッグ可能） */
export function Top3TaskTitle({ box, dateIso, slotIndex }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `box|${box.id}`,
    data: {
      boxId: box.id,
      origin: {
        kind: "top3",
        date: dateIso,
        startTime: box.startTime,
        endTime: box.endTime,
        slotIndex,
      },
    },
  });

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={box.title}
      className={cn(
        "text-[9px] truncate text-slate-700 text-left flex-1 min-w-0 touch-none cursor-grab active:cursor-grabbing block",
        isDragging && "opacity-40",
      )}
    >
      {box.title}
    </span>
  );
}
