import { addDays, parseISO } from "date-fns";
import { toISODate } from "@/lib/date";
import {
  buildDailyReflectionSection,
  buildWeeklyPlannerSection,
  upsertMarkedSection,
  type WeekExportPlan,
} from "@/lib/obsidian-export";
import type { WeekPlannerNotes } from "@/lib/types";

interface FileSystemDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker?: (options?: {
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
}

async function readTextOrEmpty(fileHandle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return "";
  }
}

async function writeText(fileHandle: FileSystemFileHandle, text: string) {
  const writable = await fileHandle.createWritable();
  await writable.write(text.endsWith("\n") ? text : `${text}\n`);
  await writable.close();
}

async function saveDailyNoteWithMarkerInBrowser(
  dailyDir: FileSystemDirectoryHandle,
  date: string,
  markerId: string,
  sectionBody: string,
): Promise<{ path: string; updated: boolean }> {
  const body = sectionBody.trim();
  const relPath = `raw/02_Daily/${date}.md`;
  if (!body) return { path: relPath, updated: false };

  const fileHandle = await dailyDir.getFileHandle(`${date}.md`, {
    create: true,
  });
  const existing = await readTextOrEmpty(fileHandle);
  const next = upsertMarkedSection(existing, markerId, body);
  await writeText(fileHandle, next);

  return { path: relPath, updated: true };
}

export function canUseBrowserVaultExport(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function exportWeekPlannerToBrowserVault(
  planner: WeekPlannerNotes,
): Promise<WeekExportPlan> {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!picker) {
    throw new Error(
      "このブラウザではフォルダ選択保存に対応していません。ChromeまたはEdgeで開いてください。",
    );
  }

  const vaultDir = await picker({ mode: "readwrite" });
  const rawDir = await vaultDir.getDirectoryHandle("raw", { create: true });
  const dailyDir = await rawDir.getDirectoryHandle("02_Daily", {
    create: true,
  });

  const weekStart = planner.weekStart;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error("週の開始日が正しくありません。");
  }

  const startDate = parseISO(weekStart);
  const days: WeekExportPlan["days"] = [];

  for (let i = 0; i < 7; i++) {
    const dateIso = toISODate(addDays(startDate, i));
    const section = buildDailyReflectionSection(
      dateIso,
      planner.realReflection ?? {},
    );

    if (!section) {
      days.push({
        date: dateIso,
        path: `raw/02_Daily/${dateIso}.md`,
        updated: false,
        skipped: true,
        reason: "振り返りメモが空です。",
      });
      continue;
    }

    const result = await saveDailyNoteWithMarkerInBrowser(
      dailyDir,
      dateIso,
      `real-reflection:${dateIso}`,
      section,
    );
    days.push({ date: dateIso, ...result, skipped: !result.updated });
  }

  const sundayDate = toISODate(addDays(startDate, 6));
  const weeklySection = buildWeeklyPlannerSection(planner);
  let weekly: WeekExportPlan["weekly"] = {
    date: sundayDate,
    path: `raw/02_Daily/${sundayDate}.md`,
    updated: false,
    skipped: true,
  };

  if (weeklySection) {
    const result = await saveDailyNoteWithMarkerInBrowser(
      dailyDir,
      sundayDate,
      `week-planner:${weekStart}`,
      weeklySection,
    );
    weekly = { date: sundayDate, ...result, skipped: !result.updated };
  }

  return { weekStart, sundayDate, days, weekly };
}
