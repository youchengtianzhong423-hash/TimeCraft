"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileUp,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./ui/Button";
import { FieldRow, Input, Select, Textarea } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { BOX_TYPES, getBoxTypeMeta } from "@/lib/boxTypes";
import { POOL_PLACEHOLDER } from "@/lib/repeatWeek";
import { diagnoseCandidateAddition } from "@/lib/text-box-diagnose";
import { findCandidateOverlaps } from "@/lib/text-box-overlap";
import { parseMemoFileContent, parseMemoText } from "@/lib/text-to-box-parser";
import type {
  EditableTextBoxCandidate,
  OverlapResolution,
  ParsedTextBox,
} from "@/lib/text-box-types";
import type { Box, BoxType } from "@/lib/types";
import { durationMinutes } from "@/lib/timeBlocks";
import { cn } from "@/lib/cn";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { toISODate } from "@/lib/date";

const PLACEHOLDER = `明日の10時から1時間Zoom
午後は動画編集を2時間
夕方に30分散歩
今週中に企画を3本考える`;

const newClientId = (): string =>
  `memo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function toEditable(
  c: ParsedTextBox,
  fallbackDate: string,
): EditableTextBoxCandidate {
  const timeUnset = !c.startTime || !c.endTime;
  const dateUnset = !c.date;
  return {
    ...c,
    id: newClientId(),
    selected: true,
    date: c.date ?? fallbackDate,
    startTime: c.startTime ?? "",
    endTime: c.endTime ?? "",
    dateUnset,
    timeUnset,
  };
}

export function MemoFromTextPanel() {
  const today = toISODate(new Date());
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const addBoxesBatch = useTimeCraftStore((s) => s.addBoxesBatch);

  const [text, setText] = useState("");
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<EditableTextBoxCandidate[]>([]);
  const [parsing, setParsing] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [pendingOverlaps, setPendingOverlaps] = useState<
    ReturnType<typeof findCandidateOverlaps>
  >([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const crowdingWarnings = useMemo(
    () => diagnoseCandidateAddition(allBoxes, candidates),
    [allBoxes, candidates],
  );

  const handleParse = useCallback(() => {
    setError(null);
    setAddedCount(null);
    setParseWarnings([]);

    if (!text.trim()) {
      setError("文章を入力してください。");
      setCandidates([]);
      return;
    }

    setParsing(true);
    try {
      const result = parseMemoText(text);
      if (result.candidates.length === 0) {
        setError(
          result.warnings[0] ??
            "タスクを1件も抽出できませんでした。1行に1つの予定を書いてください。",
        );
        setCandidates([]);
        setParseWarnings(result.warnings);
        return;
      }
      setCandidates(
        result.candidates.map((c) => toEditable(c, today)),
      );
      setParseWarnings(result.warnings);
    } catch {
      setError(
        "文章の解析に失敗しました。文章を短く区切るか、1行に1つの予定を書いて再度お試しください",
      );
      setCandidates([]);
    } finally {
      setParsing(false);
    }
  }, [text, today]);

  const loadFileContent = useCallback(
    (content: string, name: string) => {
      setError(null);
      setAddedCount(null);
      setText(content);
      const result = parseMemoFileContent(content, name);
      if (result.candidates.length > 0) {
        setCandidates(
          result.candidates.map((c) => toEditable(c, today)),
        );
        setParseWarnings(result.warnings);
      } else {
        setCandidates([]);
        setParseWarnings(result.warnings);
      }
    },
    [today],
  );

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "md" && ext !== "markdown" && ext !== "txt") {
      setError(".md または .txt ファイルを選択してください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      loadFileContent(content, file.name);
    };
    reader.onerror = () => setError("ファイルの読み込みに失敗しました。");
    reader.readAsText(file, "utf-8");
  };

  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        setError("クリップボードにテキストがありません。");
        return;
      }
      setText((prev) => (prev ? `${prev}\n${clip}` : clip));
      setError(null);
    } catch {
      setError("クリップボードへのアクセスが拒否されました。");
    }
  };

  const updateCandidate = (
    id: string,
    patch: Partial<EditableTextBoxCandidate>,
  ) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if ("date" in patch) next.dateUnset = false;
        if ("startTime" in patch || "endTime" in patch) {
          next.timeUnset = !next.startTime || !next.endTime;
        }
        if (patch.boxType === "fixed") next.isFixed = true;
        return next;
      }),
    );
  };

  const removeCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const buildBoxInputs = (
    list: EditableTextBoxCandidate[],
    mode: "grid" | "pool",
  ): Array<
    Omit<Box, "id" | "status" | "createdAt" | "updatedAt"> & {
      status?: Box["status"];
    }
  > => {
    return list.map((c) => {
      const boxType: BoxType =
        c.isFixed || c.boxType === "fixed" ? "fixed" : c.boxType;
      const base = {
        title: c.title,
        type: boxType,
        repeatRule: "none" as const,
        notify: false,
        memo: `メモから追加: ${c.sourceText}`,
      };
      if (mode === "pool" || c.timeUnset || c.dateUnset) {
        return {
          ...base,
          date: POOL_PLACEHOLDER.date(),
          startTime: POOL_PLACEHOLDER.startTime,
          endTime: POOL_PLACEHOLDER.endTime,
          plannedDuration: POOL_PLACEHOLDER.plannedDuration,
          isPooled: true,
        };
      }
      const start = c.startTime!;
      const end = c.endTime!;
      const planned = durationMinutes(start, end);
      return {
        ...base,
        date: c.date!,
        startTime: start,
        endTime: end,
        plannedDuration: planned,
        isPooled: false,
      };
    });
  };

  const commitCandidates = (
    gridList: EditableTextBoxCandidate[],
    poolList: EditableTextBoxCandidate[],
  ) => {
    const addedIds = new Set([
      ...gridList.map((c) => c.id),
      ...poolList.map((c) => c.id),
    ]);
    if (addedIds.size === 0) {
      setError("追加する候補を選択してください。");
      return;
    }

    try {
      const gridInputs = buildBoxInputs(gridList, "grid").filter(
        (i) => i.plannedDuration > 0,
      );
      const poolInputs = buildBoxInputs(poolList, "pool");
      const valid = [...gridInputs, ...poolInputs];
      if (valid.length === 0) {
        setError("時刻が設定された候補がありません。");
        return;
      }
      addBoxesBatch(valid);
      setAddedCount(valid.length);
      setCandidates((prev) =>
        prev.map((c) =>
          addedIds.has(c.id) ? { ...c, selected: false } : c,
        ),
      );
      setOverlapOpen(false);
      setPendingOverlaps([]);
      setError(null);
    } catch {
      setError("ボックスの追加に失敗しました。");
    }
  };

  const addAllSelected = (gridIds?: string[], forcePoolIds?: string[]) => {
    const selected = candidates.filter((c) => c.selected);
    const forcePool = new Set(forcePoolIds ?? []);

    const poolList = selected.filter((c) => {
      if (forcePool.has(c.id)) return true;
      if (gridIds && !gridIds.includes(c.id) && forcePoolIds) return false;
      return c.timeUnset || c.dateUnset;
    });

    const gridList = selected.filter((c) => {
      if (forcePool.has(c.id)) return false;
      if (gridIds && !gridIds.includes(c.id)) return false;
      return !c.timeUnset && !!c.date && !!c.startTime && !!c.endTime;
    });

    commitCandidates(gridList, poolList);
  };

  const handleAddClick = () => {
    setError(null);
    const selected = candidates.filter((c) => c.selected);
    if (selected.length === 0) {
      setError("追加する候補を選択してください。");
      return;
    }

    const schedulable = selected.filter(
      (c) => !c.timeUnset && c.date && c.startTime && c.endTime,
    );
    const overlaps = findCandidateOverlaps(schedulable, allBoxes);

    if (overlaps.length > 0) {
      setPendingOverlaps(overlaps);
      setOverlapOpen(true);
      return;
    }

    addAllSelected();
  };

  const handleOverlapResolve = (resolution: OverlapResolution) => {
    if (resolution === "cancel") {
      setOverlapOpen(false);
      return;
    }
    if (resolution === "editTime") {
      setOverlapOpen(false);
      const first = pendingOverlaps[0];
      if (first) setEditingId(first.candidateId);
      return;
    }
    if (resolution === "saveToPool") {
      const overlapIds = [
        ...new Set(pendingOverlaps.map((o) => o.candidateId)),
      ];
      const restGridIds = candidates
        .filter(
          (c) =>
            c.selected &&
            !overlapIds.includes(c.id) &&
            !c.timeUnset &&
            c.date,
        )
        .map((c) => c.id);
      addAllSelected(restGridIds, overlapIds);
      return;
    }
    addAllSelected();
  };

  const selectedCount = candidates.filter((c) => c.selected).length;
  const schedulableCount = candidates.filter(
    (c) =>
      c.selected &&
      !c.timeUnset &&
      !!c.date &&
      !!c.startTime &&
      !!c.endTime &&
      durationMinutes(c.startTime, c.endTime) > 0,
  ).length;

  return (
    <div className="space-y-5">
      {/* Step 1: 入力 */}
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 transition-colors",
          dragOver ? "border-indigo-400 bg-indigo-50/40" : "border-border",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <FieldRow
          label="メモを入力"
          hint="1行に1つの予定・タスクを書くと認識しやすくなります"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            className="min-h-[180px] text-sm leading-relaxed"
          />
        </FieldRow>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePasteClipboard}
          >
            <ClipboardPaste size={14} />
            クリップボードから貼り付け
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp size={14} />
            ファイルを読み込む
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-muted self-center">
            .md / .txt · ドラッグ＆ドロップ対応
          </span>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleParse} disabled={parsing}>
            <Sparkles size={14} className={parsing ? "animate-pulse" : ""} />
            {parsing ? "解析中..." : "ボックス候補を作成"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={14} />
            {error}
          </div>
        </div>
      )}

      {parseWarnings.length > 0 && !error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
          {parseWarnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {addedCount !== null && addedCount > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} />
          {addedCount} 件のボックスを追加しました（Undo で取り消せます）。
        </div>
      )}

      {/* Step 2: 候補確認 */}
      {candidates.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                ボックス候補を確認・修正
              </h3>
              <p className="text-xs text-muted mt-0.5">
                以下のボックス候補を作成しました（{candidates.length} 件）
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() =>
                  setCandidates((p) =>
                    p.map((c) => ({ ...c, selected: true })),
                  )
                }
              >
                全選択
              </button>
              <span className="text-muted">/</span>
              <button
                type="button"
                className="text-slate-600 hover:underline"
                onClick={() =>
                  setCandidates((p) =>
                    p.map((c) => ({ ...c, selected: false })),
                  )
                }
              >
                全解除
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto">
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                editing={editingId === c.id}
                onEdit={() => setEditingId(c.id)}
                onCloseEdit={() => setEditingId(null)}
                onChange={(patch) => updateCandidate(c.id, patch)}
                onRemove={() => removeCandidate(c.id)}
              />
            ))}
          </div>

          {crowdingWarnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <p className="font-medium flex items-center gap-1">
                <AlertTriangle size={12} />
                詰め込みすぎの可能性
              </p>
              {crowdingWarnings.map((m, i) => (
                <p key={i}>{m}</p>
              ))}
            </div>
          )}

          {/* Step 3: 追加 */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-muted">
              選択中:{" "}
              <span className="font-semibold text-slate-700">
                {selectedCount}
              </span>
              {schedulableCount < selectedCount && (
                <span className="ml-1 text-amber-700">
                  （うち時間未設定 {selectedCount - schedulableCount} 件は
                  やることリストへ）
                </span>
              )}
            </div>
            <Button onClick={handleAddClick} disabled={selectedCount === 0}>
              <Sparkles size={14} />
              選択したボックスを追加
            </Button>
          </div>
        </div>
      )}

      <OverlapModal
        open={overlapOpen}
        overlaps={pendingOverlaps}
        onClose={() => setOverlapOpen(false)}
        onResolve={handleOverlapResolve}
      />
    </div>
  );
}

function CandidateCard({
  candidate,
  editing,
  onEdit,
  onCloseEdit,
  onChange,
  onRemove,
}: {
  candidate: EditableTextBoxCandidate;
  editing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onChange: (patch: Partial<EditableTextBoxCandidate>) => void;
  onRemove: () => void;
}) {
  const meta = getBoxTypeMeta(candidate.boxType);
  const planned =
    candidate.startTime && candidate.endTime
      ? durationMinutes(candidate.startTime, candidate.endTime)
      : 0;

  const timeLabel = candidate.timeUnset
    ? "時間未設定"
    : `${candidate.startTime}〜${candidate.endTime}`;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        candidate.selected
          ? `${meta.bgSoft} ${meta.border}`
          : "bg-white border-slate-200 opacity-80",
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={candidate.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="mt-1 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              {timeLabel}
              {planned > 0 && (
                <span className="text-muted ml-1">({planned}分)</span>
              )}
            </span>
            {candidate.dateUnset ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                日付未設定
              </span>
            ) : (
              <span className="text-[10px] text-muted">{candidate.date}</span>
            )}
            {candidate.isFixed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                固定
              </span>
            )}
          </div>
          {!editing ? (
            <p className="font-medium text-slate-900 mt-1">{candidate.title}</p>
          ) : (
            <Input
              value={candidate.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="mt-1"
            />
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1", meta.text)}>
              {meta.emoji} 種類：{meta.shortLabel}
            </span>
            <span className="text-muted">
              優先度：
              {candidate.priority === "high"
                ? "高"
                : candidate.priority === "low"
                  ? "低"
                  : "通常"}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-1 line-clamp-2">
            元の文章：{candidate.sourceText}
          </p>

          {editing && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select
                value={candidate.boxType}
                onChange={(e) =>
                  onChange({
                    boxType: e.target.value as BoxType,
                    isFixed: e.target.value === "fixed",
                  })
                }
              >
                {BOX_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.emoji} {t.shortLabel}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={candidate.date}
                onChange={(e) => onChange({ date: e.target.value })}
              />
              <Input
                type="time"
                step={900}
                value={candidate.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
              />
              <Input
                type="time"
                step={900}
                value={candidate.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
              />
              <label className="col-span-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={candidate.isFixed}
                  onChange={(e) =>
                    onChange({
                      isFixed: e.target.checked,
                      boxType: e.target.checked ? "fixed" : candidate.boxType,
                    })
                  }
                />
                固定予定として扱う
              </label>
              <div className="col-span-2 flex justify-end">
                <Button size="sm" variant="secondary" onClick={onCloseEdit}>
                  編集を閉じる
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-white/80 text-slate-600"
            title="編集"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
            title="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function OverlapModal({
  open,
  overlaps,
  onClose,
  onResolve,
}: {
  open: boolean;
  overlaps: ReturnType<typeof findCandidateOverlaps>;
  onClose: () => void;
  onResolve: (r: OverlapResolution) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="既存の予定と時間が重なっています"
      size="md"
    >
      <div className="space-y-3 text-sm">
        <ul className="text-xs text-slate-600 space-y-2 max-h-40 overflow-y-auto">
          {overlaps.map((o, i) => (
            <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium">{o.candidateTitle}</span>
              <span className="text-muted"> と </span>
              <span className="font-medium">{o.existing.title}</span>
              <span className="text-muted">
                （{o.existing.startTime}〜{o.existing.endTime}）
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          自動では上書きしません。続け方を選んでください。
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => onResolve("addAnyway")}>
            そのまま追加
          </Button>
          <Button variant="secondary" onClick={() => onResolve("editTime")}>
            時間を変更
          </Button>
          <Button variant="secondary" onClick={() => onResolve("saveToPool")}>
            未確定候補として保存（やることリスト）
          </Button>
          <Button variant="ghost" onClick={() => onResolve("cancel")}>
            <X size={14} />
            追加をキャンセル
          </Button>
        </div>
      </div>
    </Modal>
  );
}
