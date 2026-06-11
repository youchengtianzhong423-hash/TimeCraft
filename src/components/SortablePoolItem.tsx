"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import type { Box } from "@/lib/types";
import { getBoxTypeMeta } from "@/lib/boxTypes";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  dragId: string;
  origin: { kind: "pool" };
  schedulePlacementCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SortablePoolItem({
  box,
  dragId,
  origin,
  schedulePlacementCount = 0,
  onEdit,
  onDelete,
}: Props) {
  const meta = getBoxTypeMeta(box.type);
  const done = box.status === "completed";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: { boxId: box.id, origin },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showTime =
    box.startTime &&
    box.endTime &&
    !(box.startTime === "00:00" && box.endTime === "00:00");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/sort flex items-stretch rounded-md border overflow-hidden touch-none",
        meta.bg,
        meta.border,
        meta.text,
        isDragging && "opacity-50 shadow-lg ring-2 ring-indigo-300",
        "cursor-grab active:cursor-grabbing",
      )}
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
      title="ドラッグで配置・ダブルクリックで編集"
    >
      <div className="flex items-center px-0.5 shrink-0 opacity-30 group-hover/sort:opacity-60 pointer-events-none">
        <GripVertical size={11} />
      </div>

      <div
        className={cn(
          "flex-1 min-w-0 py-1 pr-1 select-none",
          done && "opacity-60",
        )}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70 shrink-0">
            {meta.shortLabel}
          </span>
          <span
            className={cn(
              "flex-1 min-w-0 truncate text-[11px] font-medium leading-snug",
              done && "line-through",
            )}
          >
            {box.title}
          </span>
          {schedulePlacementCount > 0 && (
            <span className="text-[9px] font-medium text-indigo-700/80 shrink-0 ml-0.5">
              週{schedulePlacementCount}件
            </span>
          )}
        </div>
        {showTime && (
          <div className="text-[9px] opacity-55 leading-tight pl-3.5 mt-0.5">
            {box.startTime} – {box.endTime}
          </div>
        )}
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 self-center px-1 text-slate-500 opacity-0 group-hover/sort:opacity-70 hover:!opacity-100 md:hidden"
          aria-label="編集"
          title="編集"
        >
          <Pencil size={12} />
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 self-center px-1.5 text-[10px] opacity-0 group-hover/sort:opacity-40 hover:!opacity-100 hover:text-rose-600 transition-all"
        aria-label="削除"
      >
        ✕
      </button>
    </div>
  );
}
