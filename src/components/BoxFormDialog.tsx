"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { FieldRow, Input, Select, Textarea } from "./ui/Field";
import { BOX_TYPES, getBoxTypeMeta } from "@/lib/boxTypes";
import type { Box, BoxType, RepeatRule } from "@/lib/types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { durationMinutes, isOverlap } from "@/lib/timeBlocks";
import { cn } from "@/lib/cn";
import { Trash2, AlertTriangle, Calendar, Sparkles, ListPlus, Copy } from "lucide-react";
import { isPoolMaster } from "@/lib/poolLink";
import { POOL_PLACEHOLDER } from "@/lib/repeatWeek";
import { toISODate, weekStart } from "@/lib/date";
import {
  getRepeatPlacementDates,
  isMultiDateRepeatRule,
  REPEAT_PLACEMENT_WEEKS,
} from "@/lib/repeatPlacements";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 編集モード: 既存ボックスを渡す */
  initial?: Box;
  /** 新規作成のプリセット */
  preset?: {
    date: string;
    startTime?: string;
    endTime?: string;
    type?: BoxType;
  };
  /** やることリストから開いた場合（日付左のチェック・保存ロジック） */
  fromPool?: boolean;
  /** 表示中の週（「今週のみ」展開用） */
  weekAnchor?: Date;
}

interface FormState {
  title: string;
  type: BoxType;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  memo: string;
  notify: boolean;
  repeatRule: RepeatRule;
}

const emptyState = (preset?: Props["preset"]): FormState => ({
  title: "",
  type: preset?.type ?? "priority",
  date: preset?.date ?? new Date().toISOString().slice(0, 10),
  startTime: preset?.startTime ?? "08:00",
  endTime: preset?.endTime ?? "10:00",
  purpose: "",
  memo: "",
  notify: false,
  repeatRule: "none",
});

export function BoxFormDialog({
  open,
  onClose,
  initial,
  preset,
  fromPool = false,
  weekAnchor,
}: Props) {
  const addBox = useTimeCraftStore((s) => s.addBox);
  const updateBox = useTimeCraftStore((s) => s.updateBox);
  const removeBox = useTimeCraftStore((s) => s.removeBox);
  const removeLinkedPlacements = useTimeCraftStore((s) => s.removeLinkedPlacements);
  const syncPoolMasterRepeatPlacements = useTimeCraftStore(
    (s) => s.syncPoolMasterRepeatPlacements,
  );
  const allBoxes = useTimeCraftStore((s) => s.boxes);
  const templates = useTimeCraftStore((s) => s.templates);
  const bumpTemplateUse = useTimeCraftStore((s) => s.bumpTemplateUse);

  const [form, setForm] = useState<FormState>(emptyState(preset));
  /** やることリスト用: ON = 週間スケジュールに反映（日時編集可） */
  const [scheduleOnWeek, setScheduleOnWeek] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null,
  );

  const anchor = weekAnchor ?? new Date();

  useEffect(() => {
    if (!open) return;
    setAppliedTemplateId(null);
    if (initial) {
      const hasLinked = useTimeCraftStore
        .getState()
        .boxes.some((b) => b.poolSourceId === initial.id);
      const pooledMaster = fromPool && isPoolMaster(initial);
      const repeatOnMaster = isMultiDateRepeatRule(
        initial.repeatRule ?? "none",
      );
      setScheduleOnWeek(
        fromPool
          ? pooledMaster
            ? hasLinked || repeatOnMaster
            : true
          : true,
      );
      setForm({
        title: initial.title,
        type: initial.type,
        date: initial.date,
        startTime: initial.startTime,
        endTime: initial.endTime,
        purpose: initial.purpose ?? "",
        memo: initial.memo ?? "",
        notify: initial.notify ?? false,
        repeatRule: initial.repeatRule ?? "none",
      });
    } else {
      setScheduleOnWeek(fromPool);
      setForm(emptyState(preset));
    }
  }, [open, initial, preset, fromPool]);

  const addMinutesToTime = (hhmm: string, addMin: number): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const total = Math.min(h * 60 + (m || 0) + addMin, 24 * 60);
    const hh = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const mm = (total % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tt) => tt.id === templateId);
    if (!t) return;
    const newEnd = addMinutesToTime(form.startTime, t.defaultDurationMinutes);
    setForm({
      ...form,
      title: t.title,
      type: t.type,
      endTime: newEnd,
      purpose: t.purpose ?? form.purpose,
      memo: t.memo ?? form.memo,
    });
    setAppliedTemplateId(templateId);
  };

  const sortedTemplates = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (a.useCount !== b.useCount) return b.useCount - a.useCount;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [templates],
  );

  const isPoolPriority = fromPool && form.type === "priority";
  const needsSchedule = !fromPool || (scheduleOnWeek && !isPoolPriority);

  const planned = useMemo(
    () =>
      needsSchedule
        ? durationMinutes(form.startTime, form.endTime)
        : POOL_PLACEHOLDER.plannedDuration,
    [form.startTime, form.endTime, needsSchedule],
  );

  const overlapDates = useMemo(() => {
    if (!needsSchedule) return [];
    if (isMultiDateRepeatRule(form.repeatRule)) {
      return getRepeatPlacementDates(form.repeatRule, {
        anchor,
        startDateIso: form.date,
      });
    }
    return [form.date];
  }, [needsSchedule, form.repeatRule, form.date, anchor]);

  const overlaps = useMemo(() => {
    if (!needsSchedule) return [];
    const found: Box[] = [];
    for (const dateIso of overlapDates) {
      for (const b of allBoxes) {
        if (b.id === initial?.id) continue;
        if (b.status === "deleted" || b.isPooled) continue;
        if (b.date !== dateIso) continue;
        if (
          isOverlap(form.startTime, form.endTime, b.startTime, b.endTime)
        ) {
          found.push(b);
        }
      }
    }
    return found;
  }, [allBoxes, form, initial?.id, needsSchedule, overlapDates]);

  const priorityCountSameDay = useMemo(() => {
    if (!needsSchedule) return 0;
    const list = allBoxes.filter(
      (b) =>
        b.id !== initial?.id &&
        b.status !== "deleted" &&
        b.date === form.date &&
        b.type === "priority" &&
        !b.isPooled,
    );
    return list.length + (form.type === "priority" ? 1 : 0);
  }, [allBoxes, form.date, form.type, initial?.id, needsSchedule]);

  const canSubmit =
    form.title.trim().length > 0 &&
    (!needsSchedule || (planned > 0 && !!form.date));

  const basePayload = (repeatRule: RepeatRule = "none") => ({
    title: form.title.trim(),
    type: form.type,
    purpose: form.purpose.trim() || undefined,
    memo: form.memo.trim() || undefined,
    notify: form.notify,
    repeatRule,
  });

  const syncLinkedSchedule = (masterId: string) => {
    syncPoolMasterRepeatPlacements(masterId, {
      repeatRule: form.repeatRule,
      anchorDate: anchor,
      startDateIso: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
    });
  };

  const savePoolFlow = () => {
    if (!canSubmit) return;

    const effectiveScheduleOnWeek =
      scheduleOnWeek || isMultiDateRepeatRule(form.repeatRule);

    const weekScopeFields = {
      poolWeekStart: initial?.poolWeekStart ?? toISODate(weekStart(anchor)),
    };

    if (!effectiveScheduleOnWeek || isPoolPriority) {
      const poolPayload = {
        ...basePayload(),
        type: form.type,
        date: POOL_PLACEHOLDER.date(),
        startTime: POOL_PLACEHOLDER.startTime,
        endTime: POOL_PLACEHOLDER.endTime,
        plannedDuration: POOL_PLACEHOLDER.plannedDuration,
        isPooled: true,
        repeatRule: "none" as const,
        ...weekScopeFields,
      };
      if (initial) {
        updateBox(initial.id, poolPayload);
        removeLinkedPlacements(initial.id);
      } else {
        addBox({
          ...poolPayload,
          templateId: appliedTemplateId ?? undefined,
        });
        if (appliedTemplateId) bumpTemplateUse(appliedTemplateId);
      }
      onClose();
      return;
    }

    const masterPayload = {
      ...basePayload(form.repeatRule),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      plannedDuration: planned,
      isPooled: true,
      ...weekScopeFields,
    };

    if (initial) {
      updateBox(initial.id, {
        ...masterPayload,
        isPooled: true,
      });
      syncLinkedSchedule(initial.id);
    } else {
      const master = addBox({
        ...masterPayload,
        templateId: appliedTemplateId ?? undefined,
      });
      if (appliedTemplateId) bumpTemplateUse(appliedTemplateId);
      syncLinkedSchedule(master.id);
    }
    onClose();
  };

  const saveScheduleFlow = () => {
    if (!canSubmit) return;
    const payload = {
      ...basePayload(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      plannedDuration: planned,
      notify: form.notify,
      repeatRule: form.repeatRule,
    };

    if (initial) {
      const masterId =
        initial.poolSourceId ??
        (isPoolMaster(initial) ? initial.id : undefined);

      // グリッド直置きボックス（プール外・poolSourceId なし）に繰り返しを追加した場合は
      // pool マスターへ昇格させる。そうしないと isPooled: false のまま repeatRule を持ち、
      // reconcileAllPoolRepeatPlacements が配置コピーを生成して二重表示になる。
      const isDirectGridBox = !masterId && !initial.isPooled;
      if (isDirectGridBox && isMultiDateRepeatRule(form.repeatRule)) {
        updateBox(initial.id, {
          ...payload,
          isPooled: true,
          repeatRule: form.repeatRule,
          manuallyEdited: initial.googleEventId ? true : initial.manuallyEdited,
        });
        syncPoolMasterRepeatPlacements(initial.id, {
          repeatRule: form.repeatRule,
          anchorDate: anchor,
          startDateIso: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
        });
      } else {
        updateBox(initial.id, {
          ...payload,
          manuallyEdited: initial.googleEventId
            ? true
            : initial.manuallyEdited,
        });
        if (masterId && isMultiDateRepeatRule(form.repeatRule)) {
          updateBox(masterId, {
            ...basePayload(form.repeatRule),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            plannedDuration: planned,
            isPooled: true,
          });
          syncPoolMasterRepeatPlacements(masterId, {
            repeatRule: form.repeatRule,
            anchorDate: anchor,
            startDateIso: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
          });
        }
      }
    } else if (isMultiDateRepeatRule(form.repeatRule)) {
      const master = addBox({
        ...payload,
        date: form.date,
        isPooled: true,
        repeatRule: form.repeatRule,
        templateId: appliedTemplateId ?? undefined,
      });
      if (appliedTemplateId) bumpTemplateUse(appliedTemplateId);
      syncPoolMasterRepeatPlacements(master.id, {
        repeatRule: form.repeatRule,
        anchorDate: anchor,
        startDateIso: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      });
    } else {
      addBox({
        ...payload,
        isPooled: false,
        templateId: appliedTemplateId ?? undefined,
      });
      if (appliedTemplateId) bumpTemplateUse(appliedTemplateId);
    }
    onClose();
  };

  const handleSubmit = () => {
    if (fromPool) {
      savePoolFlow();
      return;
    }
    saveScheduleFlow();
  };

  const handleSaveToPool = () => {
    if (!form.title.trim()) return;
    setScheduleOnWeek(false);
    savePoolFlow();
  };

  const handleDuplicate = () => {
    if (!initial) return;
    addBox({
      title: form.title.trim() || initial.title,
      type: form.type,
      date: POOL_PLACEHOLDER.date(),
      startTime: POOL_PLACEHOLDER.startTime,
      endTime: POOL_PLACEHOLDER.endTime,
      plannedDuration: POOL_PLACEHOLDER.plannedDuration,
      purpose: form.purpose.trim() || undefined,
      memo: form.memo.trim() || undefined,
      notify: form.notify,
      repeatRule: "none",
      isPooled: true,
      templateId: initial.templateId,
      poolWeekStart: toISODate(weekStart(anchor)),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!initial) return;
    if (confirm("このボックスを削除しますか？")) {
      removeBox(initial.id);
      onClose();
    }
  };

  /** やることリストでも繰り返し UI は常に表示（OFF 時は無効） */
  const repeatDisabled = fromPool && !scheduleOnWeek;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        initial
          ? fromPool
            ? "やることリストを編集"
            : "ボックスを編集"
          : fromPool
            ? "やることリストに追加"
            : "新しいボックスを作成"
      }
      description={
        fromPool
          ? "週間に反映にチェック → 日時と繰り返し（今週のみなど）。外す → やることリストだけに1件保存。"
          : "2時間を基本単位に、活動を時間ブロックに配置しましょう。"
      }
      size="lg"
    >
      <div className="space-y-5">
        {initial?.googleEventId && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 flex items-start gap-2">
            <Calendar size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">
                Google カレンダーから取り込まれたボックス
              </div>
              <div className="opacity-80 mt-0.5">
                編集すると以降の自動同期で上書きされなくなります。
              </div>
            </div>
          </div>
        )}

        {!initial && sortedTemplates.length > 0 && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
            <div className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              テンプレートから作成（クリックで内容が入ります）
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sortedTemplates.map((t) => {
                const meta = getBoxTypeMeta(t.type);
                const active = appliedTemplateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors",
                      active
                        ? `${meta.bg} ${meta.border} ${meta.text} ring-2 ring-offset-1 ring-current`
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700",
                    )}
                    title={t.purpose || t.memo || ""}
                  >
                    <span>{meta.emoji}</span>
                    <span className="font-medium">{t.title}</span>
                    <span className="opacity-60">
                      {t.defaultDurationMinutes}分
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <FieldRow label="ボックス種別" required>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
            {BOX_TYPES.map((t) => {
              const active = t.type === form.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.type })}
                  className={cn(
                    "px-2.5 py-2 rounded-lg border text-left transition-colors",
                    active
                      ? `${t.bg} ${t.border} ring-2 ring-offset-1 ring-current ${t.text}`
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700",
                  )}
                >
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <span>{t.emoji}</span>
                    {t.shortLabel}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">
            {getBoxTypeMeta(form.type).description}
          </p>
        </FieldRow>

        <FieldRow label="ボックス名" required>
          <Input
            placeholder="例：YouTube台本作成 / 朝の散歩 / 銀行手続き"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
        </FieldRow>

        {isPoolPriority && (
          <p className="text-[11px] text-rose-800/90 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            優先はやることリストに<strong>件数無制限</strong>で追加できます。
            週間表では各日の <strong>Top3（最大3つ）</strong>{" "}
            へのみ配置できます（ドラッグまたは表上部のプルダウン）。
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FieldRow
            label={
              fromPool && !isPoolPriority ? (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={scheduleOnWeek}
                    onChange={(e) => setScheduleOnWeek(e.target.checked)}
                  />
                  週間に反映
                </label>
              ) : fromPool ? (
                "日付"
              ) : (
                "日付"
              )
            }
            required={needsSchedule}
          >
            <Input
              type="date"
              value={form.date}
              disabled={fromPool && !scheduleOnWeek}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </FieldRow>
          <FieldRow label="開始時刻" required={needsSchedule}>
            <Input
              type="time"
              step={900}
              value={form.startTime}
              disabled={fromPool && !scheduleOnWeek}
              onChange={(e) =>
                setForm({ ...form, startTime: e.target.value })
              }
            />
          </FieldRow>
          <FieldRow label="終了時刻" required={needsSchedule}>
            <Input
              type="time"
              step={900}
              value={form.endTime}
              disabled={fromPool && !scheduleOnWeek}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </FieldRow>
        </div>

        {fromPool && !scheduleOnWeek && (
          <p className="text-[11px] text-muted -mt-2">
            チェックなし → やることリストにだけ保存（例:「YouTubeショート」が1行）。日時・繰り返しは後から決められます。
          </p>
        )}
        {fromPool && scheduleOnWeek && (
          <p className="text-[11px] text-indigo-700/90 -mt-2">
            チェックあり → 下の日時で週間表に配置。繰り返しありならやることリストはマスター1件のまま、週間表に各日のコピーが並びます。
          </p>
        )}

        {needsSchedule && planned <= 0 && (
          <div className="text-sm text-rose-600 flex items-center gap-2">
            <AlertTriangle size={14} />
            終了時刻は開始時刻より後にしてください。
          </div>
        )}

        {needsSchedule && overlaps.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <div className="font-medium mb-1 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              既存ボックスと時間が重なっています
            </div>
            <ul className="text-xs list-disc list-inside">
              {overlaps.slice(0, 8).map((b) => (
                <li key={`${b.id}-${b.date}`}>
                  {b.date} {b.startTime}-{b.endTime} {b.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {needsSchedule &&
          !fromPool &&
          form.type === "priority" &&
          priorityCountSameDay >= 4 && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">
              <div className="font-medium mb-0.5 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                優先ボックスが多すぎます
              </div>
              <p className="text-xs">
                本当に今日やるべきことを2〜3個に絞ると、実行しやすくなります。
              </p>
            </div>
          )}

        <FieldRow label="目的" hint="なぜこのボックスをやるのか（人生・仕事への貢献）">
          <Input
            placeholder="例：来月の動画ストック作成 / 健康維持"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          />
        </FieldRow>

        <FieldRow label="メモ">
          <Textarea
            placeholder="持ち物、リサーチした内容、参考リンクなど"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
          />
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="繰り返し">
            <Select
              value={form.repeatRule}
              disabled={repeatDisabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  repeatRule: e.target.value as RepeatRule,
                })
              }
              className={cn(repeatDisabled && "opacity-50 cursor-not-allowed")}
            >
              <option value="none">繰り返さない</option>
              <option value="thisWeek">今週のみ</option>
              <option value="daily">毎日</option>
              <option value="weekdays">平日</option>
              <option value="weekly">毎週</option>
            </Select>
            {repeatDisabled && (
              <p className="text-[10px] text-muted mt-1">
                「週間に反映」にチェックを入れると選べます。
              </p>
            )}
            {!repeatDisabled && form.repeatRule === "thisWeek" && (
              <p className="text-[10px] text-muted mt-1">
                表示中の週の今日以降、毎日同じ時刻で配置します。
                {fromPool
                  ? " やることリストはマスター1件のまま、週間表にコピーが並びます。"
                  : ""}
              </p>
            )}
            {!repeatDisabled && form.repeatRule === "daily" && (
              <p className="text-[10px] text-muted mt-1">
                起点日から約{REPEAT_PLACEMENT_WEEKS}週間、毎日同じ時刻で配置します。
                {fromPool ? " やることリストはマスター1件のままです。" : ""}
              </p>
            )}
            {!repeatDisabled && form.repeatRule === "weekdays" && (
              <p className="text-[10px] text-muted mt-1">
                起点日から約{REPEAT_PLACEMENT_WEEKS}週間、平日のみ配置します。
              </p>
            )}
            {!repeatDisabled && form.repeatRule === "weekly" && (
              <p className="text-[10px] text-muted mt-1">
                起点日と同じ曜日を、{REPEAT_PLACEMENT_WEEKS}週分配置します。
              </p>
            )}
          </FieldRow>
          <FieldRow label="通知">
            <label className="h-10 flex items-center gap-2 px-3 rounded-lg border border-slate-300 bg-white text-sm">
              <input
                type="checkbox"
                checked={form.notify}
                onChange={(e) =>
                  setForm({ ...form, notify: e.target.checked })
                }
              />
              開始前に通知する
            </label>
          </FieldRow>
        </div>

        <div className="text-xs text-muted">
          予定時間：
          <span className="font-medium text-slate-700">{planned}分</span>
          {!needsSchedule && (
            <span className="ml-1">（日時未設定・やることリスト用）</span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-border">
        <div>
          {initial && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} />
              削除
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          {initial && !fromPool && (
            <Button
              variant="outline"
              onClick={handleDuplicate}
              title="このボックスをやることリストに複製する"
            >
              <Copy size={14} />
              複製してやることリストへ
            </Button>
          )}
          {!initial && !fromPool && (
            <Button
              variant="outline"
              onClick={handleSaveToPool}
              disabled={!form.title.trim()}
              title="日時を決めずに『やることリスト』に保存"
            >
              <ListPlus size={14} />
              やることリストに保存
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {initial ? "更新する" : fromPool ? "追加する" : "ボックスを追加"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
