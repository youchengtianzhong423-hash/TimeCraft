import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import type { TimeCraftState } from "@/store/useTimeCraftStore";
import type { TimeCraftBackupFile } from "@/lib/data-backup-types";
import { isTimeCraftBackupFile } from "@/lib/data-backup-types";

export type { TimeCraftState };

const DEBOUNCE_MS = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = "";
/** 「すべて削除」時に空データで上書きしない */
let permitEmptyDiskBackup = false;

export function setPermitEmptyDiskBackup(allow: boolean): void {
  permitEmptyDiskBackup = allow;
}

export function pickBackupState(state: TimeCraftState): TimeCraftBackupFile["state"] {
  return {
    boxes: state.boxes,
    templates: state.templates,
    weekPlannerByWeek: state.weekPlannerByWeek,
    dailyReviews: state.dailyReviews,
    weeklyReviews: state.weeklyReviews,
    googleSync: state.googleSync,
  };
}

export function buildBackupFile(state: TimeCraftState): TimeCraftBackupFile {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    state: pickBackupState(state),
  };
}

/** 変更のたびに PC へ自動保存（デバウンス） */
export function scheduleDiskBackup(state: TimeCraftState): void {
  if (!permitEmptyDiskBackup && !hasUserScheduleData(state)) {
    return;
  }
  const payload = buildBackupFile(state);
  const serialized = JSON.stringify(payload.state);
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushDiskBackup(payload);
  }, DEBOUNCE_MS);
}

export async function flushDiskBackup(
  payload?: TimeCraftBackupFile,
): Promise<boolean> {
  const body = payload ?? buildBackupFile(useTimeCraftStore.getState());
  try {
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.warn("[TimeCraft] disk backup failed", e);
    return false;
  }
}

export async function fetchDiskBackup(): Promise<{
  backup: TimeCraftBackupFile | null;
  lastModified: string | null;
  dataDir: string | null;
}> {
  try {
    const res = await fetch("/api/backup", { cache: "no-store" });
    if (!res.ok) return { backup: null, lastModified: null, dataDir: null };
    const json: unknown = await res.json();
    if (!json || typeof json !== "object") {
      return { backup: null, lastModified: null, dataDir: null };
    }
    const o = json as {
      backup?: unknown;
      lastModified?: string | null;
      dataDir?: string | null;
    };
    const backup = isTimeCraftBackupFile(o.backup) ? o.backup : null;
    return {
      backup,
      lastModified: o.lastModified ?? null,
      dataDir: o.dataDir ?? null,
    };
  } catch {
    return { backup: null, lastModified: null, dataDir: null };
  }
}

export function hasUserScheduleData(state: TimeCraftState): boolean {
  if (state.boxes.length > 0) return true;
  return Object.values(state.weekPlannerByWeek).some(
    (w) =>
      (w.weeklyPriority?.trim() ?? "") !== "" ||
      (w.microSuccess?.trim() ?? "") !== "" ||
      (w.weeklyEvaluation?.trim() ?? "") !== "" ||
      Object.values(w.dailyPriority ?? {}).some((t) => t.trim() !== "") ||
      Object.keys(w.realReflection ?? {}).length > 0,
  );
}
