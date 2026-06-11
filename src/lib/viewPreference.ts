export const SCHEDULE_VIEW_STORAGE_KEY = "timecraft-selected-view";

export type ScheduleViewPreference = "today" | "week";

export function parseScheduleViewPreference(
  raw: string | null,
): ScheduleViewPreference {
  return raw === "today" ? "today" : "week";
}

export function readScheduleViewPreference(): ScheduleViewPreference {
  if (typeof window === "undefined") return "week";
  try {
    return parseScheduleViewPreference(
      localStorage.getItem(SCHEDULE_VIEW_STORAGE_KEY),
    );
  } catch {
    return "week";
  }
}

export function saveScheduleViewPreference(view: ScheduleViewPreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCHEDULE_VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}
