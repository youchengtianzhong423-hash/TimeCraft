"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";

interface Props {
  dropId: string;
  data: {
    kind: "grid";
    date: string;
    startTime: string;
    endTime: string;
  };
  children: React.ReactNode;
  className?: string;
}

export function DroppableCell({ dropId, data, children, className }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: dropId, data });
  return (
    <div
      ref={setNodeRef}
      data-droppable-id={dropId}
      className={cn(
        className,
        "transition-colors",
        isOver && "bg-indigo-100/70 ring-2 ring-indigo-300 ring-inset",
      )}
    >
      {children}
    </div>
  );
}
