"use client";

import { useCallback, type RefObject } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { parseTop3DropId } from "@/lib/top3";
import { isMultiDateRepeatRule } from "@/lib/repeatPlacements";
import { canHostPoolPlacements, isPoolMaster } from "@/lib/poolLink";
import { canDropBoxOntoTop3 } from "@/lib/priorityRules";
import { durationMinutes } from "@/lib/timeBlocks";
import { snapBoxMoveTimes } from "@/lib/plannerSlots";
import type { Box } from "@/lib/types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";

export function useScheduleDragEnd(options: {
  allBoxes: Box[];
  anchor: Date;
  altHeldRef: RefObject<boolean>;
}) {
  const { allBoxes, anchor, altHeldRef } = options;

  const moveBoxOnGrid = useTimeCraftStore((s) => s.moveBoxOnGrid);
  const duplicateBoxOnGrid = useTimeCraftStore((s) => s.duplicateBoxOnGrid);
  const moveBoxToPool = useTimeCraftStore((s) => s.moveBoxToPool);
  const placeBoxFromPool = useTimeCraftStore((s) => s.placeBoxFromPool);
  const syncPoolMasterRepeatPlacements = useTimeCraftStore(
    (s) => s.syncPoolMasterRepeatPlacements,
  );
  const placeBoxInTop3 = useTimeCraftStore((s) => s.placeBoxInTop3);
  const reorderPool = useTimeCraftStore((s) => s.reorderPool);

  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      if (!activeId.startsWith("box|")) return;
      const boxId = activeId.slice("box|".length);

      const overId = String(over.id);
      const origin = active.data.current?.origin as
        | {
            kind: "grid" | "pool" | "top3";
            date?: string;
            startTime?: string;
            endTime?: string;
            slotIndex?: number;
          }
        | undefined;

      if (origin?.kind === "pool" && overId.startsWith("box|")) {
        const overBoxId = overId.slice("box|".length);
        const overBox = allBoxes.find((b) => b.id === overBoxId);
        if (overBox?.isPooled && boxId !== overBoxId) {
          const poolMasters = [...allBoxes]
            .filter((b) => isPoolMaster(b))
            .sort((a, b) => {
              const ao = a.poolOrder ?? 0;
              const bo = b.poolOrder ?? 0;
              return ao !== bo ? ao - bo : a.createdAt.localeCompare(b.createdAt);
            });
          const activeIdx = poolMasters.findIndex((b) => b.id === boxId);
          const overIdx = poolMasters.findIndex((b) => b.id === overBoxId);
          if (activeIdx !== -1 && overIdx !== -1) {
            reorderPool(
              arrayMove(poolMasters, activeIdx, overIdx).map((b) => b.id),
            );
          }
          return;
        }
      }

      if (overId === "pool") {
        if (origin?.kind === "pool") return;
        moveBoxToPool(boxId);
        return;
      }

      const top3Target = parseTop3DropId(overId);
      if (top3Target) {
        const { date, slotIndex } = top3Target;
        const box = allBoxes.find((b) => b.id === boxId);
        if (box && !canDropBoxOntoTop3(box, allBoxes)) return;
        if (
          origin?.kind === "top3" &&
          origin.date === date &&
          origin.slotIndex === slotIndex
        ) {
          return;
        }
        placeBoxInTop3(boxId, date, slotIndex);
        return;
      }

      if (overId.startsWith("cell|")) {
        const [, date, dropStart] = overId.split("|");
        const box = allBoxes.find((b) => b.id === boxId);
        const dur =
          (box && durationMinutes(box.startTime, box.endTime)) ||
          box?.plannedDuration ||
          60;
        const { startTime, endTime } = snapBoxMoveTimes(dropStart, dur);
        const activator = event.activatorEvent;
        const altDuplicate =
          altHeldRef.current ||
          (activator instanceof MouseEvent && activator.altKey) ||
          (activator instanceof PointerEvent && activator.altKey);
        if (
          origin?.kind === "grid" &&
          origin.date === date &&
          origin.startTime === startTime &&
          origin.endTime === endTime
        ) {
          return;
        }
        if (origin?.kind === "grid" && altDuplicate) {
          duplicateBoxOnGrid(boxId, date, startTime, endTime);
          return;
        }
        if (origin?.kind === "pool") {
          const master = allBoxes.find((b) => b.id === boxId);
          if (
            master &&
            canHostPoolPlacements(master) &&
            isMultiDateRepeatRule(master.repeatRule ?? "none")
          ) {
            syncPoolMasterRepeatPlacements(boxId, {
              repeatRule: master.repeatRule ?? "none",
              anchorDate: anchor,
              startDateIso: date,
              startTime,
              endTime,
            });
          } else {
            placeBoxFromPool(boxId, date, startTime, endTime);
          }
        } else {
          moveBoxOnGrid(boxId, date, startTime, endTime);
        }
      }
    },
    [
      allBoxes,
      anchor,
      altHeldRef,
      duplicateBoxOnGrid,
      moveBoxOnGrid,
      moveBoxToPool,
      placeBoxFromPool,
      placeBoxInTop3,
      reorderPool,
      syncPoolMasterRepeatPlacements,
    ],
  );
}
