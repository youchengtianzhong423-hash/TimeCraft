"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Box,
  BoxStatus,
  BoxTemplate,
  DailyReview,
  GoogleAuthState,
  GoogleCalendarInfo,
  GoogleSyncSettings,
  RepeatRule,
  Theme,
  WeeklyReview,
  WeekPlannerNotes,
} from "@/lib/types";
import {
  getRepeatPlacementDates,
  isMultiDateRepeatRule,
} from "@/lib/repeatPlacements";
import { needsRepeatReconcile } from "@/lib/repeatReconcile";
import { newId } from "@/lib/id";
import { toISODate, weekStart } from "@/lib/date";
import {
  collectWeekScheduleBoxes,
  duplicateWeekBoxPayload,
  shouldSkipWeekDuplicate,
} from "@/lib/duplicateWeek";
import { snapBoxMoveTimes } from "@/lib/plannerSlots";
import {
  minutesToHHmm,
  PLANNER_BLOCK_COUNT,
  DEFAULT_SCHEDULE_START_HOUR,
  snapScheduleMinutes,
  toMinutes,
} from "@/lib/timeBlocks";
import { getTop3SlotTimes } from "@/lib/top3";
import {
  canDropBoxOntoTop3,
  canPlacePriorityOnVisionGrid,
} from "@/lib/priorityRules";
import {
  canHostPoolPlacements,
  isLinkedPlacement,
  isPoolMaster,
} from "@/lib/poolLink";
import { createGridPlacement } from "@/lib/placementFactory";
import {
  cleanRealReflectionRecord,
  normalizeReflectionText,
} from "@/lib/reflectionCell";
import type { BoxType } from "@/lib/types";

const MASTER_SYNC_FIELDS = [
  "title",
  "type",
  "purpose",
  "memo",
] as const satisfies readonly (keyof Box)[];

/** Stable default — must not allocate new objects in selectors (avoids React #185 loop). */
export const EMPTY_WEEK_PLANNER: WeekPlannerNotes = {
  weekStart: "",
  weeklyPriority: "",
  microSuccess: "",
  weeklyEvaluation: "",
  dailyPriority: {},
  realReflection: {},
};

/** 永続化データの欠損フィールドを補う（既に完全なら同じ参照を返す） */
function normalizeWeekPlanner(
  w: WeekPlannerNotes,
  weekStartKey: string,
): WeekPlannerNotes {
  const dailyPriority = w.dailyPriority ?? {};
  const realReflection = cleanRealReflectionRecord(w.realReflection ?? {});
  if (
    w.weekStart === weekStartKey &&
    w.dailyPriority === dailyPriority &&
    w.realReflection === realReflection
  ) {
    return w;
  }
  return {
    weekStart: weekStartKey,
    weeklyPriority: w.weeklyPriority ?? "",
    microSuccess: w.microSuccess ?? "",
    weeklyEvaluation: w.weeklyEvaluation ?? "",
    dailyPriority,
    realReflection,
  };
}

export interface TimeCraftState {
  theme: Theme;
  setTheme: (t: Theme) => void;

  scheduleStartHour: number;
  setScheduleStartHour: (h: number) => void;

  boxes: Box[];
  templates: BoxTemplate[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  googleAuth: GoogleAuthState;
  googleSync: GoogleSyncSettings;
  /** 手帳風週間ビューのサイドメモ（週キーごと） */
  weekPlannerByWeek: Record<string, WeekPlannerNotes>;

  getWeekPlanner: (anchorDate: Date) => WeekPlannerNotes;
  updateWeekPlanner: (
    anchorDate: Date,
    patch: Partial<
      Pick<
        WeekPlannerNotes,
        | "weeklyPriority"
        | "microSuccess"
        | "weeklyEvaluation"
        | "dailyPriority"
      >
    >,
  ) => void;
  setDailyPriority: (date: string, text: string, anchorDate: Date) => void;
  setRealReflection: (cellKey: string, text: string, anchorDate: Date) => void;
  /** スケジュール上のボックス終了時刻を変更（下端リサイズ） */
  resizeBoxEndTime: (
    id: string,
    endTime: string,
    options?: { record?: boolean },
  ) => void;
  /** スケジュール上のボックス開始時刻を変更（上端リサイズ） */
  resizeBoxStartTime: (
    id: string,
    startTime: string,
    options?: { record?: boolean },
  ) => void;
  /** グリッド上のボックスを複製（元は残す） */
  duplicateBoxOnGrid: (
    sourceId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => Box | null;
  /** 同一時刻で複数曜日へ横方向複製 */
  duplicateBoxesToDates: (sourceId: string, dates: string[]) => Box[];
  /** 表示週の予定・週間メモを翌週へ複製 */
  duplicateWeekToNext: (anchorDate: Date) => number;

  addBox: (
    input: Omit<Box, "id" | "status" | "createdAt" | "updatedAt"> & {
      status?: BoxStatus;
    },
  ) => Box;
  /** 複数ボックスを1回の Undo 履歴で追加 */
  addBoxesBatch: (
    inputs: Array<
      Omit<Box, "id" | "status" | "createdAt" | "updatedAt"> & {
        status?: BoxStatus;
      }
    >,
  ) => Box[];
  updateBox: (id: string, patch: Partial<Box>) => void;
  removeBox: (id: string) => void;
  /** やることリストマスターに紐づく週間配置コピーをすべて削除 */
  removeLinkedPlacements: (masterId: string) => void;
  /**
   * マスターの繰り返しルールに従い週間表へ配置を展開・同期する。
   * 複数日ルールは既存コピーを削除してから再配置する。
   */
  syncPoolMasterRepeatPlacements: (
    masterId: string,
    params: {
      repeatRule: RepeatRule;
      anchorDate: Date;
      startDateIso: string;
      startTime: string;
      endTime: string;
    },
  ) => void;
  /** 繰り返し設定済みマスターの週間配置を期待件数まで再展開（起動時修復用） */
  reconcileAllPoolRepeatPlacements: (anchorDate?: Date) => number;
  setBoxStatus: (id: string, status: BoxStatus) => void;
  completeBox: (
    id: string,
    completion: NonNullable<Box["completion"]>,
    actualDuration?: number,
  ) => void;

  /** ボックスをスケジュール上の別の位置（日付・時刻）に移動 */
  moveBoxOnGrid: (
    id: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => void;
  /** ボックスをやることリスト（プール）に移す */
  moveBoxToPool: (id: string) => void;
  /** ボックスをやることリストからスケジュールへ配置 */
  placeBoxFromPool: (
    id: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => void;
  /** Top3 スロットへ配置（やることリスト / グリッド / Top3 間の移動） */
  placeBoxInTop3: (id: string, date: string, slotIndex: number) => void;
  /** Top3 スロットを空にする */
  clearTop3Slot: (date: string, slotIndex: number) => void;
  /** プール内の並び替え */
  reorderPool: (orderedIds: string[]) => void;

  /** テンプレート CRUD */
  addTemplate: (
    input: Omit<BoxTemplate, "id" | "useCount" | "createdAt" | "updatedAt"> & {
      useCount?: number;
    },
  ) => BoxTemplate;
  updateTemplate: (id: string, patch: Partial<BoxTemplate>) => void;
  removeTemplate: (id: string) => void;
  /** テンプレート使用回数 +1（よく使う順表示用） */
  bumpTemplateUse: (id: string) => void;

  upsertDailyReview: (
    review: Omit<DailyReview, "id" | "createdAt" | "updatedAt">,
  ) => DailyReview;
  upsertWeeklyReview: (
    review: Omit<WeeklyReview, "id" | "createdAt" | "updatedAt">,
  ) => WeeklyReview;

  setGoogleAuth: (auth: Partial<GoogleAuthState>) => void;
  clearGoogleAuth: () => void;
  setGoogleSync: (patch: Partial<GoogleSyncSettings>) => void;
  setAvailableCalendars: (cals: GoogleCalendarInfo[]) => void;
  toggleCalendarSelection: (calendarId: string) => void;
  /** googleEventId 単位の upsert（同期処理用） */
  upsertBoxByGoogleEvent: (
    googleEventId: string,
    data: Omit<Box, "id" | "status" | "createdAt" | "updatedAt"> & {
      status?: BoxStatus;
    },
  ) => "created" | "updated" | "skipped";

  /** Chrome バックアップ等からボックス・週間メモを復元（ID重複はスキップ） */
  importRecoveredState: (payload: {
    boxes?: Box[];
    weekPlannerByWeek?: Record<string, WeekPlannerNotes>;
  }) => { addedBoxes: number; replaced: boolean };

  /** PC ディスクバックアップから全体を復元（localStorage が空のとき） */
  importBackupState: (payload: {
    boxes: Box[];
    templates?: BoxTemplate[];
    weekPlannerByWeek?: Record<string, WeekPlannerNotes>;
    dailyReviews?: DailyReview[];
    weeklyReviews?: WeeklyReview[];
    googleSync?: GoogleSyncSettings;
  }) => void;

  resetAll: () => void;

  /** 操作履歴を1つ戻す（Ctrl+Z 相当） */
  undo: () => void;
  /** 操作履歴を1つ進む（Ctrl+Y 相当） */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  /** 週間 / 今日ビューで選択中のボックス ID */
  selectedBoxId: string | null;
  setSelectedBoxId: (id: string | null) => void;
}

const nowIso = (): string => new Date().toISOString();

/** "HH:mm" 形式の差を分数で返す。end < start なら 0。 */
const timeDiffMinutes = (start: string, end: string): number => {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const d = toMin(end) - toMin(start);
  return d > 0 ? d : 0;
};

export const useTimeCraftStore = create<TimeCraftState>()(
  persist(
    (set, get) => {
      // Undo/redo history (closure-scoped, not persisted)
      const _past: { boxes: Box[] }[] = [];
      const _future: { boxes: Box[] }[] = [];
      const HISTORY_LIMIT = 50;

      function record() {
        _past.push({ boxes: [...get().boxes] });
        if (_past.length > HISTORY_LIMIT) _past.shift();
        _future.length = 0;
      }

      return {
      theme: "navy" as Theme,
      setTheme: (t: Theme) => set({ theme: t }),

      scheduleStartHour: DEFAULT_SCHEDULE_START_HOUR,
      setScheduleStartHour: (h: number) => set({ scheduleStartHour: h }),

      boxes: [],
      templates: [],
      dailyReviews: [],
      weeklyReviews: [],
      googleAuth: { accessToken: null, expiresAt: null },
      googleSync: {
        selectedCalendarIds: [],
        availableCalendars: [],
        lastSyncedAt: null,
        pastWeeks: 1,
        futureWeeks: 4,
      },
      weekPlannerByWeek: {},

      getWeekPlanner: (anchorDate) => {
        const key = toISODate(weekStart(anchorDate));
        return get().weekPlannerByWeek[key] ?? EMPTY_WEEK_PLANNER;
      },

      updateWeekPlanner: (anchorDate, patch) => {
        const key = toISODate(weekStart(anchorDate));
        const stored = get().weekPlannerByWeek[key];
        const cur = normalizeWeekPlanner(
          stored ?? EMPTY_WEEK_PLANNER,
          key,
        );
        set({
          weekPlannerByWeek: {
            ...get().weekPlannerByWeek,
            [key]: normalizeWeekPlanner({ ...cur, ...patch }, key),
          },
        });
      },

      setDailyPriority: (date, text, anchorDate) => {
        const key = toISODate(weekStart(anchorDate));
        const stored = get().weekPlannerByWeek[key];
        const cur = normalizeWeekPlanner(
          stored ?? EMPTY_WEEK_PLANNER,
          key,
        );
        set({
          weekPlannerByWeek: {
            ...get().weekPlannerByWeek,
            [key]: normalizeWeekPlanner(
              {
                ...cur,
                dailyPriority: { ...cur.dailyPriority, [date]: text },
              },
              key,
            ),
          },
        });
      },

      setRealReflection: (cellKey, text, anchorDate) => {
        const key = toISODate(weekStart(anchorDate));
        const stored = get().weekPlannerByWeek[key];
        const cur = normalizeWeekPlanner(
          stored ?? EMPTY_WEEK_PLANNER,
          key,
        );
        const normalized = normalizeReflectionText(text);
        const nextReflection = { ...cur.realReflection };
        if (normalized.trim()) {
          nextReflection[cellKey] = normalized;
        } else {
          delete nextReflection[cellKey];
        }
        set({
          weekPlannerByWeek: {
            ...get().weekPlannerByWeek,
            [key]: normalizeWeekPlanner(
              {
                ...cur,
                realReflection: nextReflection,
              },
              key,
            ),
          },
        });
      },

      resizeBoxEndTime: (id, endTime, options) => {
        const now = nowIso();
        const scheduleEndMin = Math.min(
          (get().scheduleStartHour + PLANNER_BLOCK_COUNT) * 60,
          24 * 60,
        );
        if (options?.record) record();
        set({
          boxes: get().boxes.map((b) => {
            if (b.id !== id) return b;
            let endMin = snapScheduleMinutes(toMinutes(endTime));
            const startMin = toMinutes(b.startTime);
            endMin = Math.max(startMin + 15, Math.min(scheduleEndMin, endMin));
            const end = minutesToHHmm(endMin);
            const planned = timeDiffMinutes(b.startTime, end);
            if (planned <= 0) return b;
            return {
              ...b,
              endTime: end,
              plannedDuration: planned,
              manuallyEdited: true,
              updatedAt: now,
            };
          }),
          ...(options?.record
            ? { canUndo: true, canRedo: false }
            : {}),
        });
      },

      resizeBoxStartTime: (id, startTime, options) => {
        const now = nowIso();
        const scheduleStartMin = get().scheduleStartHour * 60;
        if (options?.record) record();
        set({
          boxes: get().boxes.map((b) => {
            if (b.id !== id) return b;
            let startMin = snapScheduleMinutes(toMinutes(startTime));
            const endMin = toMinutes(b.endTime);
            startMin = Math.max(
              scheduleStartMin,
              Math.min(endMin - 15, startMin),
            );
            const start = minutesToHHmm(startMin);
            const planned = timeDiffMinutes(start, b.endTime);
            if (planned <= 0) return b;
            return {
              ...b,
              startTime: start,
              plannedDuration: planned,
              manuallyEdited: true,
              updatedAt: now,
            };
          }),
          ...(options?.record
            ? { canUndo: true, canRedo: false }
            : {}),
        });
      },

      duplicateWeekToNext: (anchorDate) => {
        const now = nowIso();
        const allBoxes = get().boxes;

        // 通常スケジュールボックスを翌週へ複製
        const source = collectWeekScheduleBoxes(allBoxes, anchorDate);
        const newBoxes: Box[] = source
          .filter((b) => !shouldSkipWeekDuplicate(b, allBoxes))
          .map((b) => ({
            ...duplicateWeekBoxPayload(b, 7),
            id: newId(),
            createdAt: now,
            updatedAt: now,
          }));

        record();
        set({
          boxes: [...get().boxes, ...newBoxes],
          canUndo: true,
          canRedo: false,
        });
        return newBoxes.length;
      },

      addBox: (input) => {
        const box: Box = {
          ...input,
          id: newId(),
          status: input.status ?? "notStarted",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        record();
        set({ boxes: [...get().boxes, box], canUndo: true, canRedo: false });
        return box;
      },

      addBoxesBatch: (inputs) => {
        if (inputs.length === 0) return [];
        const now = nowIso();
        const newBoxes: Box[] = inputs.map((input) => ({
          ...input,
          id: newId(),
          status: input.status ?? "notStarted",
          createdAt: now,
          updatedAt: now,
        }));
        record();
        set({
          boxes: [...get().boxes, ...newBoxes],
          canUndo: true,
          canRedo: false,
        });
        return newBoxes;
      },

      updateBox: (id, patch) => {
        const now = nowIso();
        const target = get().boxes.find((b) => b.id === id);
        const syncPatch: Partial<Box> = {};
        if (target && isPoolMaster(target)) {
          for (const key of MASTER_SYNC_FIELDS) {
            if (key in patch) {
              (syncPatch as Record<string, unknown>)[key] = patch[key];
            }
          }
        }
        record();
        set({
          boxes: get().boxes.map((b) => {
            if (b.id === id) return { ...b, ...patch, updatedAt: now };
            if (
              target &&
              isPoolMaster(target) &&
              b.poolSourceId === id &&
              Object.keys(syncPatch).length > 0
            ) {
              return { ...b, ...syncPatch, updatedAt: now };
            }
            return b;
          }),
          canUndo: true,
          canRedo: false,
        });
      },

      removeBox: (id) => {
        const target = get().boxes.find((b) => b.id === id);
        const cascadeMaster =
          target && isPoolMaster(target);
        record();
        set({
          boxes: get().boxes.filter((b) => {
            if (b.id === id) return false;
            if (cascadeMaster && b.poolSourceId === id) return false;
            return true;
          }),
          canUndo: true,
          canRedo: false,
        });
      },

      removeLinkedPlacements: (masterId) => {
        set({
          boxes: get().boxes.filter((b) => b.poolSourceId !== masterId),
        });
      },

      syncPoolMasterRepeatPlacements: (masterId, params) => {
        const master = get().boxes.find((b) => b.id === masterId);
        if (!master || !canHostPoolPlacements(master)) return;
        /** 優先は週間 Vision へ展開せず Top3 のみ */
        const { repeatRule, anchorDate, startDateIso, startTime, endTime } =
          params;

        if (isMultiDateRepeatRule(repeatRule)) {
          const dates = getRepeatPlacementDates(repeatRule, {
            anchor: anchorDate,
            startDateIso,
          });
          const dur =
            timeDiffMinutes(startTime, endTime) ||
            master.plannedDuration ||
            60;
          const snapped = snapBoxMoveTimes(startTime, dur);
          const now = nowIso();
          const plannedDuration =
            timeDiffMinutes(snapped.startTime, snapped.endTime) ||
            master.plannedDuration;

          const recurrenceGroupId =
            master.recurrenceGroupId ?? newId();
          const existingLinked = get().boxes.filter(
            (b) =>
              b.poolSourceId === masterId && b.status !== "deleted",
          );
          const existingByDate = new Map(
            existingLinked.map((b) => [b.date, b]),
          );
          const expectedSet = new Set(dates);

          const newPlacements: Box[] = [];
          for (const dateIso of dates) {
            if (existingByDate.has(dateIso)) continue;
            newPlacements.push(
              createGridPlacement(master, {
                date: dateIso,
                startTime: snapped.startTime,
                endTime: snapped.endTime,
                plannedDuration,
                poolSourceId: master.id,
                recurrenceGroupId,
                now,
              }),
            );
          }

          const removeIds = existingLinked
            .filter(
              (b) =>
                !expectedSet.has(b.date) &&
                !b.manuallyEdited &&
                !b.recurrenceGroupId,
            )
            .map((b) => b.id);

          record();
          set({
            boxes: [
              ...get()
                .boxes.filter((b) => !removeIds.includes(b.id))
                .map((b) => {
                  if (b.id === masterId && !b.recurrenceGroupId) {
                    return { ...b, recurrenceGroupId, updatedAt: now };
                  }
                  return b;
                }),
              ...newPlacements,
            ],
            canUndo: true,
            canRedo: false,
          });
          return;
        }

        const linked = get().boxes.filter(
          (b) => b.poolSourceId === masterId && b.status !== "deleted",
        );
        if (linked.length === 0) {
          get().placeBoxFromPool(masterId, startDateIso, startTime, endTime);
          return;
        }
        const target =
          linked.find((b) => b.date === startDateIso) ?? linked[0];
        get().updateBox(target.id, {
          date: startDateIso,
          startTime,
          endTime,
          plannedDuration:
            timeDiffMinutes(startTime, endTime) || master.plannedDuration,
          manuallyEdited: true,
        });
      },

      reconcileAllPoolRepeatPlacements: (anchorDate) => {
        const anchor = anchorDate ?? new Date();
        const masters = get().boxes.filter((b) => {
          const rule = b.repeatRule ?? "none";
          return canHostPoolPlacements(b) && isMultiDateRepeatRule(rule);
        });
        let count = 0;
        for (const master of masters) {
          if (!needsRepeatReconcile(get().boxes, master, anchor)) continue;
          const rule = master.repeatRule ?? "none";
          get().syncPoolMasterRepeatPlacements(master.id, {
            repeatRule: rule,
            anchorDate: anchor,
            startDateIso: master.date,
            startTime: master.startTime,
            endTime: master.endTime,
          });
          count++;
        }
        return count;
      },

      setBoxStatus: (id, status) => {
        const now = nowIso();
        set({
          boxes: get().boxes.map((b) => {
            if (b.id !== id) return b;
            const patch: Partial<Box> = { status, updatedAt: now };
            if (status === "inProgress" && !b.startedAt) patch.startedAt = now;
            if (status === "paused") patch.pausedAt = now;
            if (status === "completed") patch.completedAt = now;
            return { ...b, ...patch };
          }),
        });
      },

      completeBox: (id, completion, actualDuration) => {
        const now = nowIso();
        record();
        set({
          boxes: get().boxes.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: "completed",
                  completion,
                  actualDuration:
                    actualDuration !== undefined
                      ? actualDuration
                      : b.actualDuration,
                  completedAt: now,
                  updatedAt: now,
                }
              : b,
          ),
          canUndo: true,
          canRedo: false,
        });
      },

      moveBoxOnGrid: (id, date, startTime, endTime) => {
        const now = nowIso();
        const target = get().boxes.find((b) => b.id === id);
        if (target && !canPlacePriorityOnVisionGrid(target)) return;
        const dur =
          timeDiffMinutes(startTime, endTime) ||
          (target ? timeDiffMinutes(target.startTime, target.endTime) : 0) ||
          target?.plannedDuration ||
          60;
        const snapped = snapBoxMoveTimes(startTime, dur);
        const planned = timeDiffMinutes(snapped.startTime, snapped.endTime);
        record();
        set({
          boxes: get().boxes.map((b) =>
            b.id === id
              ? {
                  ...b,
                  date,
                  startTime: snapped.startTime,
                  endTime: snapped.endTime,
                  plannedDuration: planned > 0 ? planned : b.plannedDuration,
                  isPooled: false,
                  manuallyEdited: true,
                  updatedAt: now,
                }
              : b,
          ),
          canUndo: true,
          canRedo: false,
        });
      },

      duplicateBoxOnGrid: (sourceId, date, startTime, endTime) => {
        const source = get().boxes.find((b) => b.id === sourceId);
        if (!source || source.isPooled) return null;
        if (!canPlacePriorityOnVisionGrid(source)) return null;

        const dur =
          timeDiffMinutes(startTime, endTime) ||
          timeDiffMinutes(source.startTime, source.endTime) ||
          source.plannedDuration ||
          60;
        const snapped = snapBoxMoveTimes(startTime, dur);
        const planned = timeDiffMinutes(snapped.startTime, snapped.endTime);
        const now = nowIso();

        const copy = createGridPlacement(source, {
          date,
          startTime: snapped.startTime,
          endTime: snapped.endTime,
          plannedDuration: planned > 0 ? planned : source.plannedDuration,
          poolSourceId: undefined,
          recurrenceGroupId: source.recurrenceGroupId,
          now,
        });
        copy.manuallyEdited = true;

        record();
        set({
          boxes: [...get().boxes, copy],
          canUndo: true,
          canRedo: false,
        });
        return copy;
      },

      duplicateBoxesToDates: (sourceId, dates) => {
        const source = get().boxes.find((b) => b.id === sourceId);
        if (!source || source.isPooled) return [];

        const uniqueDates = [
          ...new Set(dates.filter((d) => d !== source.date)),
        ];
        if (uniqueDates.length === 0) return [];

        const now = nowIso();
        const copies = uniqueDates.map((date) => {
          const copy = createGridPlacement(source, {
            date,
            startTime: source.startTime,
            endTime: source.endTime,
            plannedDuration: source.plannedDuration,
            poolSourceId: undefined,
            recurrenceGroupId: source.recurrenceGroupId,
            now,
          });
          copy.manuallyEdited = true;
          return copy;
        });

        record();
        set({
          boxes: [...get().boxes, ...copies],
          canUndo: true,
          canRedo: false,
        });
        return copies;
      },

      moveBoxToPool: (id) => {
        const box = get().boxes.find((b) => b.id === id);
        if (!box) return;
        if (isLinkedPlacement(box)) {
          record();
          set({ boxes: get().boxes.filter((b) => b.id !== id), canUndo: true, canRedo: false });
          return;
        }
        if (isPoolMaster(box)) return;
        const now = nowIso();
        const maxOrder = get()
          .boxes.filter((b) => isPoolMaster(b))
          .reduce((m, b) => Math.max(m, b.poolOrder ?? 0), 0);
        record();
        set({
          boxes: get().boxes.map((b) =>
            b.id === id
              ? {
                  ...b,
                  isPooled: true,
                  poolOrder: maxOrder + 1,
                  poolSourceId: undefined,
                  updatedAt: now,
                }
              : b,
          ),
          canUndo: true,
          canRedo: false,
        });
      },

      placeBoxFromPool: (masterId, date, startTime, endTime) => {
        const master = get().boxes.find((b) => b.id === masterId);
        if (!master) return;
        if (isLinkedPlacement(master)) {
          get().moveBoxOnGrid(masterId, date, startTime, endTime);
          return;
        }
        if (!isPoolMaster(master)) return;

        const dur =
          timeDiffMinutes(startTime, endTime) ||
          master.plannedDuration ||
          60;
        const snapped = snapBoxMoveTimes(startTime, dur);
        const now = nowIso();
        const planned = timeDiffMinutes(snapped.startTime, snapped.endTime);
        const plannedDuration =
          planned > 0 ? planned : master.plannedDuration;

        /** 同一マスター・同日・同時刻枠への再ドロップのみ上書き（同日に複数枠OK） */
        const existing = get().boxes.find(
          (b) =>
            b.poolSourceId === masterId &&
            b.date === date &&
            b.startTime === snapped.startTime &&
            b.endTime === snapped.endTime &&
            b.status !== "deleted",
        );
        if (existing) {
          record();
          set({
            boxes: get().boxes.map((b) =>
              b.id === existing.id
                ? {
                    ...b,
                    startTime: snapped.startTime,
                    endTime: snapped.endTime,
                    plannedDuration,
                    updatedAt: now,
                  }
                : b,
            ),
            canUndo: true,
            canRedo: false,
          });
          return;
        }

        const placement = createGridPlacement(master, {
          date,
          startTime: snapped.startTime,
          endTime: snapped.endTime,
          plannedDuration,
          poolSourceId: master.id,
          recurrenceGroupId: master.recurrenceGroupId,
          now,
        });
        record();
        set({ boxes: [...get().boxes, placement], canUndo: true, canRedo: false });
      },

      placeBoxInTop3: (id, date, slotIndex) => {
        const slot = getTop3SlotTimes(slotIndex);
        const box = get().boxes.find((b) => b.id === id);
        if (!box) return;
        if (!canDropBoxOntoTop3(box, get().boxes)) return;

        let boxes = get().boxes;
        const displaced = boxes.find(
          (b) =>
            b.id !== id &&
            b.date === date &&
            b.startTime === slot.start &&
            !b.isPooled &&
            b.status !== "deleted",
        );
        if (displaced) {
          boxes = boxes.filter((b) => b.id !== displaced.id);
        }

        record();
        if (isPoolMaster(box)) {
          const now = nowIso();
          const planned = timeDiffMinutes(slot.start, slot.end);
          const placement: Box = {
            ...box,
            id: newId(),
            poolSourceId: box.id,
            date,
            startTime: slot.start,
            endTime: slot.end,
            type: "priority",
            plannedDuration: planned > 0 ? planned : box.plannedDuration,
            isPooled: false,
            poolOrder: undefined,
            status: "notStarted",
            completion: undefined,
            startedAt: undefined,
            pausedAt: undefined,
            completedAt: undefined,
            googleEventId: undefined,
            googleCalendarId: undefined,
            createdAt: now,
            updatedAt: now,
          };
          set({ boxes: [...boxes, placement], canUndo: true, canRedo: false });
          return;
        }

        const now = nowIso();
        const planned = timeDiffMinutes(slot.start, slot.end);
        set({
          boxes: boxes.map((b) =>
            b.id === id
              ? {
                  ...b,
                  date,
                  startTime: slot.start,
                  endTime: slot.end,
                  type: "priority" as BoxType,
                  plannedDuration: planned > 0 ? planned : b.plannedDuration,
                  isPooled: false,
                  poolOrder: undefined,
                  updatedAt: now,
                }
              : b,
          ),
          canUndo: true,
          canRedo: false,
        });
      },

      clearTop3Slot: (date, slotIndex) => {
        const slot = getTop3SlotTimes(slotIndex);
        const target = get().boxes.find(
          (b) =>
            b.date === date &&
            b.startTime === slot.start &&
            !b.isPooled &&
            b.status !== "deleted",
        );
        if (!target) return;
        record();
        set({ boxes: get().boxes.filter((b) => b.id !== target.id), canUndo: true, canRedo: false });
      },

      reorderPool: (orderedIds) => {
        const now = nowIso();
        const orderMap = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
        record();
        set({
          boxes: get().boxes.map((b) =>
            isPoolMaster(b) && orderMap.has(b.id)
              ? { ...b, poolOrder: orderMap.get(b.id), updatedAt: now }
              : b,
          ),
          canUndo: true,
          canRedo: false,
        });
      },

      addTemplate: (input) => {
        const now = nowIso();
        const tpl: BoxTemplate = {
          ...input,
          id: newId(),
          useCount: input.useCount ?? 0,
          createdAt: now,
          updatedAt: now,
        };
        set({ templates: [...get().templates, tpl] });
        return tpl;
      },

      updateTemplate: (id, patch) => {
        const now = nowIso();
        set({
          templates: get().templates.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: now } : t,
          ),
        });
      },

      removeTemplate: (id) => {
        set({ templates: get().templates.filter((t) => t.id !== id) });
      },

      bumpTemplateUse: (id) => {
        const now = nowIso();
        set({
          templates: get().templates.map((t) =>
            t.id === id
              ? { ...t, useCount: t.useCount + 1, updatedAt: now }
              : t,
          ),
        });
      },

      upsertDailyReview: (input) => {
        const existing = get().dailyReviews.find(
          (r) => r.date === input.date,
        );
        if (existing) {
          const updated: DailyReview = {
            ...existing,
            ...input,
            updatedAt: nowIso(),
          };
          set({
            dailyReviews: get().dailyReviews.map((r) =>
              r.id === existing.id ? updated : r,
            ),
          });
          return updated;
        }
        const created: DailyReview = {
          ...input,
          id: newId(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set({ dailyReviews: [...get().dailyReviews, created] });
        return created;
      },

      upsertWeeklyReview: (input) => {
        const existing = get().weeklyReviews.find(
          (r) => r.weekStartDate === input.weekStartDate,
        );
        if (existing) {
          const updated: WeeklyReview = {
            ...existing,
            ...input,
            updatedAt: nowIso(),
          };
          set({
            weeklyReviews: get().weeklyReviews.map((r) =>
              r.id === existing.id ? updated : r,
            ),
          });
          return updated;
        }
        const created: WeeklyReview = {
          ...input,
          id: newId(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set({ weeklyReviews: [...get().weeklyReviews, created] });
        return created;
      },

      setGoogleAuth: (auth) => {
        set({ googleAuth: { ...get().googleAuth, ...auth } });
      },

      clearGoogleAuth: () => {
        set({
          googleAuth: { accessToken: null, expiresAt: null },
          googleSync: {
            ...get().googleSync,
            selectedCalendarIds: [],
            availableCalendars: [],
            lastSyncedAt: null,
            lastSyncSummary: undefined,
          },
        });
      },

      setGoogleSync: (patch) => {
        set({ googleSync: { ...get().googleSync, ...patch } });
      },

      setAvailableCalendars: (cals) => {
        const current = get().googleSync;
        const selected =
          current.selectedCalendarIds.length > 0
            ? current.selectedCalendarIds.filter((id) =>
                cals.some((c) => c.id === id),
              )
            : cals.filter((c) => c.primary).map((c) => c.id);
        set({
          googleSync: {
            ...current,
            availableCalendars: cals,
            selectedCalendarIds: selected,
          },
        });
      },

      toggleCalendarSelection: (calendarId) => {
        const current = get().googleSync;
        const isSelected = current.selectedCalendarIds.includes(calendarId);
        set({
          googleSync: {
            ...current,
            selectedCalendarIds: isSelected
              ? current.selectedCalendarIds.filter((id) => id !== calendarId)
              : [...current.selectedCalendarIds, calendarId],
          },
        });
      },

      upsertBoxByGoogleEvent: (googleEventId, data) => {
        const now = nowIso();
        const existing = get().boxes.find(
          (b) => b.googleEventId === googleEventId,
        );
        if (existing) {
          // ユーザーが手動編集している場合は上書きしない
          if (existing.manuallyEdited) return "skipped";
          set({
            boxes: get().boxes.map((b) =>
              b.id === existing.id
                ? {
                    ...b,
                    ...data,
                    googleEventId,
                    updatedAt: now,
                  }
                : b,
            ),
          });
          return "updated";
        }
        const box: Box = {
          ...data,
          id: newId(),
          status: data.status ?? "notStarted",
          googleEventId,
          createdAt: now,
          updatedAt: now,
        };
        set({ boxes: [...get().boxes, box] });
        return "created";
      },

      importBackupState: (payload) => {
        const weekPlannerByWeek = { ...get().weekPlannerByWeek };
        for (const [key, notes] of Object.entries(
          payload.weekPlannerByWeek ?? {},
        )) {
          weekPlannerByWeek[key] = normalizeWeekPlanner(notes, key);
        }
        set({
          boxes: payload.boxes,
          templates: payload.templates ?? get().templates,
          dailyReviews: payload.dailyReviews ?? get().dailyReviews,
          weeklyReviews: payload.weeklyReviews ?? get().weeklyReviews,
          googleSync: payload.googleSync
            ? { ...get().googleSync, ...payload.googleSync }
            : get().googleSync,
          weekPlannerByWeek,
        });
      },

      importRecoveredState: (payload) => {
        const incoming = payload.boxes ?? [];
        const existing = get().boxes;
        const existingIds = new Set(existing.map((b) => b.id));

        let nextBoxes: Box[];
        let replaced = false;
        if (existing.length === 0 && incoming.length > 0) {
          nextBoxes = incoming;
          replaced = true;
        } else {
          const toAdd = incoming.filter((b) => !existingIds.has(b.id));
          const existingTitles = new Set(
            existing
              .filter((b) => b.isPooled && !b.poolSourceId)
              .map((b) => b.title),
          );
          const deduped = toAdd.filter(
            (b) =>
              !(
                b.isPooled &&
                !b.poolSourceId &&
                existingTitles.has(b.title)
              ),
          );
          nextBoxes = [...existing, ...deduped];
        }

        const plannerPatch = payload.weekPlannerByWeek ?? {};
        const nextPlanner = { ...get().weekPlannerByWeek };
        for (const [key, notes] of Object.entries(plannerPatch)) {
          if (!nextPlanner[key] || Object.keys(nextPlanner[key]).length === 0) {
            nextPlanner[key] = normalizeWeekPlanner(notes, key);
          }
        }

        set({
          boxes: nextBoxes,
          weekPlannerByWeek: nextPlanner,
        });
        return {
          addedBoxes: nextBoxes.length - existing.length,
          replaced,
        };
      },

      resetAll: () => {
        set({
          boxes: [],
          templates: [],
          dailyReviews: [],
          weeklyReviews: [],
          googleAuth: { accessToken: null, expiresAt: null },
          googleSync: {
            selectedCalendarIds: [],
            availableCalendars: [],
            lastSyncedAt: null,
            pastWeeks: 1,
            futureWeeks: 4,
          },
          weekPlannerByWeek: {},
        });
      },

      canUndo: false,
      canRedo: false,

      selectedBoxId: null,
      setSelectedBoxId: (id) => set({ selectedBoxId: id }),

      undo: () => {
        const prev = _past.pop();
        if (!prev) return;
        _future.push({ boxes: [...get().boxes] });
        set({ boxes: prev.boxes, canUndo: _past.length > 0, canRedo: true });
      },

      redo: () => {
        const next = _future.pop();
        if (!next) return;
        _past.push({ boxes: [...get().boxes] });
        set({ boxes: next.boxes, canUndo: true, canRedo: _future.length > 0 });
      },
    };
  },
    {
      name: "timecraft-storage-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, err) => {
        if (err) {
          console.warn(
            "[TimeCraft] localStorage の読み込みに失敗しました。データは削除しません。PC バックアップから復元を試みます。",
            err,
          );
          return;
        }
        if (!state) return;
        // ページリロード後は履歴が消えるので canUndo/canRedo をリセット
        state.canUndo = false;
        state.canRedo = false;
        if (state.weekPlannerByWeek) {
          for (const key of Object.keys(state.weekPlannerByWeek)) {
            state.weekPlannerByWeek[key] = normalizeWeekPlanner(
              state.weekPlannerByWeek[key],
              key,
            );
          }
        }
        // poolWeekStart 未設定の pool マスターを今週に移行（旧データ対応）
        const thisWeek = toISODate(weekStart(new Date()));
        if (state.boxes) {
          for (const b of state.boxes) {
            // isPooled: false のまま繰り返しルールを持つグリッドボックスを pool マスターへ昇格。
            // 保存前に repeatRule を追加した場合にできる壊れたデータを修復する。
            // ※ poolWeekStart 設定より先に実行しないと thisWeek が付かない。
            if (
              b.isPooled === false &&
              !b.poolSourceId &&
              isMultiDateRepeatRule(b.repeatRule ?? "none")
            ) {
              b.isPooled = true;
            }
            if (b.isPooled && !b.poolSourceId && !b.poolWeekStart) {
              b.poolWeekStart = thisWeek;
            }
          }
        }
      },
    },
  ),
);

import { useEffect, useState } from "react";

/** SSR セーフな初期ハイドレーション。クライアントマウント後のみ true。 */
/** Week planner notes for anchor week (stable selector — no infinite re-render). */
export function useWeekPlanner(anchorDate: Date): WeekPlannerNotes {
  const key = toISODate(weekStart(anchorDate));
  return useTimeCraftStore((s) => s.weekPlannerByWeek[key] ?? EMPTY_WEEK_PLANNER);
}

export const useHasHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  useEffect(() => {
    if (useTimeCraftStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useTimeCraftStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return () => {
      unsub();
    };
  }, []);
  return hydrated;
};
