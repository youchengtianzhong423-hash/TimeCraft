import type { Page } from "@playwright/test";

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayOfWeek(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getLocalDateKey(date);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

export async function seedStore(
  page: Page,
  boxes: Record<string, unknown>[],
) {
  await page.addInitScript((seedBoxes) => {
    const now = new Date().toISOString();
    const payload = {
      state: {
        theme: "navy",
        scheduleStartHour: 6,
        boxes: seedBoxes.map((b) => ({
          status: "notStarted",
          repeatRule: "none",
          plannedDuration: 60,
          createdAt: now,
          updatedAt: now,
          ...b,
        })),
        templates: [],
        weekPlannerByWeek: {},
        canUndo: false,
        canRedo: false,
        selectedBoxId: null,
      },
      version: 0,
    };
    localStorage.setItem("timecraft-storage-v1", JSON.stringify(payload));
  }, boxes);
}

export async function waitForPlanner(page: Page) {
  await page.goto("/");
  await page.waitForSelector("[data-week-planner]", { timeout: 15_000 });
  await page.waitForTimeout(500);
}
