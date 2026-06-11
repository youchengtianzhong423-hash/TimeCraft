"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Inbox, Plus } from "lucide-react";
import type { Box } from "@/lib/types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { countGridLinkedPlacements, isPoolMaster } from "@/lib/poolLink";
import { getLocalDateKey, toISODate, weekStart } from "@/lib/date";
import { DraggableBoxItem } from "./DraggableBoxItem";
import { SortablePoolItem } from "./SortablePoolItem";
import { BoxFormDialog } from "./BoxFormDialog";
import { Button } from "./ui/Button";
import { cn } from "@/lib/cn";

const POOL_HEIGHT_KEY = "timecraft-pool-panel-height-v1";
const POOL_DEFAULT_HEIGHT = 440;
const POOL_MIN_HEIGHT = 200;
const POOL_MAX_HEIGHT = 900;

interface Props {
  boxes: Box[];
  /** 表示中の週（「今週のみ」展開用） */
  weekAnchor: Date;
  /** 縦長サイドバーレイアウト（左カラム用）。
   *  true: 1 列で並べ、ヘッダーをコンパクトに。
   *  false: 横並びグリッド（ページ下部用）。
   */
  vertical?: boolean;
  className?: string;
}

export function PoolPanel({ boxes, weekAnchor, vertical, className }: Props) {
  const removeBox = useTimeCraftStore((s) => s.removeBox);
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const { isOver, setNodeRef } = useDroppable({
    id: "pool",
    data: { kind: "pool" },
  });

  const [editingBox, setEditingBox] = useState<Box | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vertical || !panelRef.current) return;
    const saved = localStorage.getItem(POOL_HEIGHT_KEY);
    if (saved) {
      const h = Number.parseInt(saved, 10);
      if (h >= POOL_MIN_HEIGHT && h <= POOL_MAX_HEIGHT) {
        panelRef.current.style.height = `${h}px`;
      }
    }
  }, [vertical]);

  useEffect(() => {
    if (!vertical || !panelRef.current) return;
    const el = panelRef.current;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      if (h >= POOL_MIN_HEIGHT && h <= POOL_MAX_HEIGHT) {
        localStorage.setItem(POOL_HEIGHT_KEY, String(h));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vertical]);

  const currentWeekStart = toISODate(weekStart(weekAnchor));
  const masters = boxes.filter((b) => {
    if (!isPoolMaster(b)) return false;
    // poolWeekStart 未設定（旧データ）は常に表示
    if (!b.poolWeekStart) return true;
    // 今週のアイテムのみ表示
    return b.poolWeekStart === currentWeekStart;
  });
  const sorted = [...masters].sort((a, b) => {
    const ao = a.poolOrder ?? 0;
    const bo = b.poolOrder ?? 0;
    if (ao !== bo) return ao - bo;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          panelRef.current = node;
        }}
        className={cn(
          "rounded-2xl border border-border bg-white transition-colors flex flex-col",
          vertical
            ? "p-3 min-h-[380px] max-h-[min(900px,calc(100vh-11rem))] resize-y overflow-hidden"
            : "p-4",
          isOver && "bg-indigo-50/60 ring-2 ring-indigo-300 ring-inset",
          className,
        )}
        style={vertical ? { height: POOL_DEFAULT_HEIGHT } : undefined}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 shrink-0",
            vertical ? "mb-2" : "mb-3",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg grid place-items-center bg-amber-100 text-amber-700 shrink-0">
              <Inbox size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                やることリスト
              </div>
              {vertical && (
                <div className="text-[10px] text-muted leading-snug">
                  優先は何件でも可・週間はTop3のみ
                </div>
              )}
              {!vertical && (
                <div className="text-[11px] text-muted">
                  日時未定のタスク置き場。ドラッグしてスケジュールに配置できます。
                </div>
              )}
              {vertical && (
                <div className="text-[10px] text-muted leading-snug">
                  {sorted.length} 件 ・ 1項目＝リスト1行（週間はコピー）
                  <br />
                  ドラッグで配置 ・ 右下角で高さ調整
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!vertical && (
              <span className="text-xs text-muted">{sorted.length} 件</span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              追加
            </Button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div
            className={cn(
              "text-center text-sm text-muted border-2 border-dashed border-slate-200 rounded-xl",
              vertical
                ? "flex-1 min-h-[10rem] flex flex-col items-center justify-center py-4 text-xs"
                : "py-8",
            )}
          >
            <p>まだタスクがありません。</p>
            <p className="text-[11px] mt-1">
              「追加」、またはスケジュール上のボックスをここにドラッグ。
            </p>
          </div>
        ) : vertical ? (
          <SortableContext
            items={sorted.map((b) => `box|${b.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1 overflow-y-auto pr-1 -mr-1 flex-1 min-h-0">
              {sorted.map((b) => {
                const placementCount = isPoolMaster(b)
                  ? countGridLinkedPlacements(allBoxes, b.id)
                  : 0;
                return (
                  <li key={b.id} className="shrink-0">
                    <SortablePoolItem
                      box={b}
                      dragId={`box|${b.id}`}
                      origin={{ kind: "pool" }}
                      schedulePlacementCount={placementCount}
                      onEdit={() => {
                        setEditingBox(b);
                        setFormOpen(true);
                      }}
                      onDelete={() => {
                        if (confirm(`「${b.title}」を削除しますか？`)) {
                          removeBox(b.id);
                        }
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </SortableContext>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sorted.map((b) => {
              const placementCount = isPoolMaster(b)
                ? countGridLinkedPlacements(allBoxes, b.id)
                : 0;
              return (
                <li key={b.id}>
                  <DraggableBoxItem
                    box={b}
                    dragId={`box|${b.id}`}
                    origin={{ kind: "pool" }}
                    dragHandleOnly={false}
                    schedulePlacementCount={placementCount}
                    onDoubleClick={() => {
                      setEditingBox(b);
                      setFormOpen(true);
                    }}
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`「${b.title}」を削除しますか？`)) {
                          removeBox(b.id);
                        }
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-600 mt-0.5 px-1"
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BoxFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingBox(undefined);
        }}
        initial={editingBox}
        fromPool
        weekAnchor={weekAnchor}
      />
      <BoxFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        preset={{ date: getLocalDateKey() }}
        fromPool
        weekAnchor={weekAnchor}
      />
    </>
  );
}
