import type {
  Box,
  BoxTemplate,
  DailyReview,
  GoogleSyncSettings,
  WeeklyReview,
  WeekPlannerNotes,
} from "@/lib/types";

/** PC 上に保存するバックアップ（localStorage とは別経路） */
export interface TimeCraftBackupFile {
  version: 1;
  savedAt: string;
  state: {
    boxes: Box[];
    templates: BoxTemplate[];
    weekPlannerByWeek: Record<string, WeekPlannerNotes>;
    dailyReviews: DailyReview[];
    weeklyReviews: WeeklyReview[];
    googleSync: GoogleSyncSettings;
  };
}

export function isTimeCraftBackupFile(v: unknown): v is TimeCraftBackupFile {
  if (!v || typeof v !== "object") return false;
  const o = v as TimeCraftBackupFile;
  return (
    o.version === 1 &&
    typeof o.savedAt === "string" &&
    !!o.state &&
    Array.isArray(o.state.boxes)
  );
}
