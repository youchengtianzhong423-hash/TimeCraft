"use client";

import { Calendar, Pencil } from "lucide-react";
import type { Box } from "@/lib/types";
import { getBoxTypeMeta } from "@/lib/boxTypes";
import { BoxActions } from "./BoxActions";
import { cn } from "@/lib/cn";

interface Props {
  box: Box;
  onEdit?: (box: Box) => void;
}

export function BoxListItem({ box, onEdit }: Props) {
  const meta = getBoxTypeMeta(box.type);
  const done = box.status === "completed";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 bg-white flex flex-col gap-3 transition-colors",
        meta.border,
        done && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-xs font-medium",
            meta.bg,
            meta.text,
          )}
        >
          <span className="mr-1">{meta.emoji}</span>
          {meta.shortLabel}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-semibold text-slate-900 flex items-center gap-1.5",
              done && "line-through",
            )}
          >
            {box.title}
            {box.googleEventId && (
              <span
                title="Google カレンダー連携"
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium"
              >
                <Calendar size={10} />G
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {box.startTime} – {box.endTime} ({box.plannedDuration}分)
            {box.isAllDay && " ・ 終日"}
          </div>
          {box.purpose && (
            <div className="mt-2 text-xs text-slate-600">
              目的：{box.purpose}
            </div>
          )}
          {box.memo && (
            <div className="mt-1 text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">
              {box.memo}
            </div>
          )}
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(box)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            aria-label="編集"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <BoxActions box={box} />
        <StatusBadge status={box.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Box["status"] }) {
  const map: Record<Box["status"], { label: string; cls: string }> = {
    notStarted: { label: "未開始", cls: "bg-slate-100 text-slate-700" },
    inProgress: { label: "実行中", cls: "bg-emerald-100 text-emerald-700" },
    paused: { label: "一時停止", cls: "bg-amber-100 text-amber-700" },
    completed: { label: "完了", cls: "bg-indigo-100 text-indigo-700" },
    postponed: { label: "延期", cls: "bg-zinc-100 text-zinc-700" },
    deleted: { label: "削除", cls: "bg-rose-100 text-rose-700" },
  };
  const v = map[status];
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px]", v.cls)}>
      {v.label}
    </span>
  );
}
