"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { top3DropId } from "@/lib/top3";

interface Props {
  date: string;
  slotIndex: number;
  children: React.ReactNode;
  className?: string;
}

export function DroppableTop3Slot({
  date,
  slotIndex,
  children,
  className,
}: Props) {
  const dropId = top3DropId(date, slotIndex);
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: {
      kind: "top3",
      date,
      slotIndex,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-droppable-id={dropId}
      className={cn(
        className,
        isOver && "bg-indigo-50/80",
      )}
    >
      {children}
    </div>
  );
}
