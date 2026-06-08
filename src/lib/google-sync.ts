import { addWeeks, format, startOfWeek } from "date-fns";
import {
  GoogleAuthError,
  type GoogleEvent,
  listEvents,
} from "./google-calendar";
import type { Box } from "./types";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";

/** ISO 文字列を yyyy-MM-dd / HH:mm 形式へ変換（ローカルタイム） */
function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: format(d, "yyyy-MM-dd"),
    time: format(d, "HH:mm"),
  };
}

/** GoogleEvent から Box への変換結果 */
interface ConvertResult {
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  plannedDuration: number;
}

const ALL_DAY_RANGE: Omit<ConvertResult, "date"> = {
  startTime: "00:00",
  endTime: "23:59",
  isAllDay: true,
  plannedDuration: 24 * 60,
};

function convertEventToBoxFields(ev: GoogleEvent): ConvertResult | null {
  // 終日イベント
  if (ev.start.date && ev.end.date) {
    return { date: ev.start.date, ...ALL_DAY_RANGE };
  }
  if (!ev.start.dateTime || !ev.end.dateTime) return null;
  const startSplit = splitDateTime(ev.start.dateTime);
  const endSplit = splitDateTime(ev.end.dateTime);

  // 日跨ぎイベントはスキップ（MVP: 同日内のみ取り込み）
  if (startSplit.date !== endSplit.date) return null;

  const sm = parseHHMM(startSplit.time);
  const em = parseHHMM(endSplit.time);
  const duration = em - sm;
  if (duration <= 0) return null;

  return {
    date: startSplit.date,
    startTime: startSplit.time,
    endTime: endSplit.time,
    isAllDay: false,
    plannedDuration: duration,
  };
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  ignored: number;
  error?: string;
}

/** Google カレンダーからイベントを取得して固定ボックスに同期 */
export async function syncFromGoogleCalendar(): Promise<SyncResult> {
  const state = useTimeCraftStore.getState();
  const token = state.googleAuth.accessToken;
  if (!token) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      ignored: 0,
      error: "Google に接続されていません。",
    };
  }
  const { selectedCalendarIds, pastWeeks, futureWeeks } = state.googleSync;
  if (selectedCalendarIds.length === 0) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      ignored: 0,
      error: "同期するカレンダーが選択されていません。",
    };
  }

  const weekAnchor = startOfWeek(new Date(), { weekStartsOn: 1 });
  const timeMin = addWeeks(weekAnchor, -pastWeeks);
  const timeMax = addWeeks(weekAnchor, futureWeeks + 1);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let ignored = 0;

  try {
    for (const calId of selectedCalendarIds) {
      const events = await listEvents(token, calId, timeMin, timeMax);
      for (const ev of events) {
        if (ev.status === "cancelled") continue;
        const fields = convertEventToBoxFields(ev);
        if (!fields) {
          ignored++;
          continue;
        }
        const payload: Omit<
          Box,
          "id" | "status" | "createdAt" | "updatedAt"
        > = {
          title: ev.summary?.trim() || "(無題の予定)",
          type: "fixed",
          date: fields.date,
          startTime: fields.startTime,
          endTime: fields.endTime,
          plannedDuration: fields.plannedDuration,
          isAllDay: fields.isAllDay,
          purpose: ev.location?.trim() || undefined,
          memo: ev.description?.trim() || undefined,
          notify: false,
          repeatRule: "none",
          googleCalendarId: calId,
        };
        const result = state.upsertBoxByGoogleEvent(ev.id, payload);
        if (result === "created") created++;
        else if (result === "updated") updated++;
        else skipped++;
      }
    }

    const summary = { created, updated, skipped };
    state.setGoogleSync({
      lastSyncedAt: new Date().toISOString(),
      lastSyncSummary: summary,
    });
    return { ...summary, ignored };
  } catch (e) {
    const error =
      e instanceof GoogleAuthError
        ? e.message
        : e instanceof Error
          ? e.message
          : "不明なエラーが発生しました";
    state.setGoogleSync({
      lastSyncedAt: new Date().toISOString(),
      lastSyncSummary: { created, updated, skipped, error },
    });
    return { created, updated, skipped, ignored, error };
  }
}
