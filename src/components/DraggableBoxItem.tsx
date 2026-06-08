"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { Box } from "@/lib/types";
import type { ScheduleDisplayDensity } from "@/lib/scheduleDisplay";
import { BoxCard } from "./BoxCard";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  onClick?: () => void;
  compact?: boolean;
  /** 親要素の高さいっぱいに広げる（タイムライン表示用） */
  fillHeight?: boolean;
  /** ドラッグ用の ID（dnd-kit）。ふつうは `box|<id>` 形式 */
  dragId: string;
  /** 自身が現在いる場所のメタ。onDragEnd で「同じセルに置いた」判定に使う */
  origin?: {
    kind: "grid" | "pool" | "top3";
    date?: string;
    startTime?: string;
    endTime?: string;
    slotIndex?: number;
  };
  /** false = カード全体でドラッグ（やることリスト向け） */
  dragHandleOnly?: boolean;
  /** スケジュール表示：やることリスト以外では編集不可 */
  readOnly?: boolean;
  /** やることリストマスター：週間に配置済みのコピー数 */
  schedulePlacementCount?: number;
  /** 週間グリッド上の表示密度 */
  scheduleDensity?: ScheduleDisplayDensity;
}

export function DraggableBoxItem({
  box,
  onClick,
  compact,
  fillHeight,
  dragId,
  origin,
  dragHandleOnly = true,
  readOnly = false,
  schedulePlacementCount = 0,
  scheduleDensity,
}: Props) {
  const hideSideHandle =
    readOnly && fillHeight && scheduleDensity === "minimal";
  /** 週間 Vision はカード全体でドラッグ（サイズ変更は親のリサイズ帯） */
  const showSideGrip =
    dragHandleOnly && !hideSideHandle && !(readOnly && fillHeight);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: { boxId: box.id, origin },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const dragProps = { ...listeners, ...attributes };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/drag",
        fillHeight && "h-full w-full min-w-0",
        isDragging && "opacity-40",
        !showSideGrip && "touch-none cursor-grab active:cursor-grabbing",
      )}
      {...(!showSideGrip ? dragProps : {})}
    >
      <div
        className={cn(
          showSideGrip ? "flex items-stretch gap-1" : "block",
          fillHeight && "h-full w-full",
        )}
      >
        {showSideGrip && (
          <button
            type="button"
            {...dragProps}
            aria-label="ドラッグして移動"
            className="touch-none cursor-grab active:cursor-grabbing w-3.5 shrink-0 grid place-items-center text-slate-300 hover:text-slate-500 opacity-0 group-hover/drag:opacity-100 transition-opacity focus:opacity-100"
          >
            <GripVertical size={12} />
          </button>
        )}
        <div className={cn(showSideGrip ? "flex-1 min-w-0" : "w-full", fillHeight && "h-full")}>
          <BoxCard
            box={box}
            onClick={readOnly ? undefined : onClick}
            compact={compact}
            fillHeight={fillHeight}
            readOnly={readOnly}
            schedulePlacementCount={schedulePlacementCount}
            scheduleDensity={scheduleDensity}
          />
        </div>
      </div>
    </div>
  );
}
