import { test, expect } from "@playwright/test";
import {
  addDaysIso,
  getLocalDateKey,
  mondayOfWeek,
  seedStore,
  waitForPlanner,
} from "./helpers";

test.describe("TimeCraft schedule E2E", () => {
  test("view preference saves and restores today view", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector("[data-week-planner]", { timeout: 15_000 });

    await page.getByRole("link", { name: "今日", exact: true }).click();
    await expect(page).toHaveURL(/\/today/);

    const saved = await page.evaluate(() =>
      localStorage.getItem("timecraft-selected-view"),
    );
    expect(saved).toBe("today");

    await page.goto("/");
    await expect(page).toHaveURL(/\/today/);
  });

  test("priority pool item can be dragged to Monday grid", async ({ page }) => {
    const mon = mondayOfWeek();
    const poolId = "e2e-pool-priority";
    await seedStore(page, [
      {
        id: poolId,
        title: "E2E優先タスク",
        type: "priority",
        date: mon,
        startTime: "00:00",
        endTime: "00:00",
        isPooled: true,
        poolOrder: 1,
        poolWeekStart: mon,
      },
    ]);
    await waitForPlanner(page);

    const poolCard = page.locator("aside").getByText("E2E優先タスク").first();
    await expect(poolCard).toBeVisible();

    const tue = addDaysIso(mon, 1);
    const dropCell = page.locator(`[data-droppable-id="cell|${tue}|10:00|10:15"]`).first();
    await expect(dropCell).toBeVisible();

    const from = await poolCard.boundingBox();
    const to = await dropCell.boundingBox();
    if (!from || !to) throw new Error("drag targets missing");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + 8, to.y + 8, { steps: 24 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(500);

    const placedCount = await page.evaluate((masterId) => {
      const raw = localStorage.getItem("timecraft-storage-v1");
      if (!raw) return 0;
      const boxes = JSON.parse(raw).state.boxes as { poolSourceId?: string }[];
      return boxes.filter((b) => b.poolSourceId === masterId).length;
    }, poolId);
    expect(placedCount).toBeGreaterThan(0);

    const placed = page.locator("[data-schedule-box]").filter({ hasText: "E2E優先タスク" });
    await expect(placed.first()).toBeVisible();
  });

  test("select box and delete with Backspace, undo restores", async ({
    page,
  }) => {
    const mon = mondayOfWeek();
    const boxId = "e2e-grid-box";
    await seedStore(page, [
      {
        id: boxId,
        title: "削除テスト",
        type: "fixed",
        date: mon,
        startTime: "14:00",
        endTime: "15:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const box = page.locator("[data-schedule-box]").filter({ hasText: "削除テスト" });
    await box.click();
    await page.keyboard.press("Backspace");
    await expect(box).toHaveCount(0);

    await page.getByRole("button", { name: "元に戻す" }).click();
    await expect(page.locator("[data-schedule-box]").filter({ hasText: "削除テスト" })).toBeVisible();
  });

  test("delete ignored while typing in input", async ({ page }) => {
    const mon = mondayOfWeek();
    await seedStore(page, [
      {
        id: "e2e-keep-box",
        title: "残すボックス",
        type: "fixed",
        date: mon,
        startTime: "09:00",
        endTime: "10:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const box = page.locator("[data-schedule-box]").filter({ hasText: "残すボックス" });
    await box.click();
    await page.getByRole("button", { name: "ボックスを追加" }).click();
    const titleInput = page.getByLabel("ボックス名");
    await titleInput.fill("あ");
    await page.keyboard.press("Backspace");
    const stillInStore = await page.evaluate(() => {
      const raw = localStorage.getItem("timecraft-storage-v1");
      const boxes = JSON.parse(raw!).state.boxes as { id: string }[];
      return boxes.some((b) => b.id === "e2e-keep-box");
    });
    expect(stillInStore).toBe(true);
    await page.keyboard.press("Escape");
  });

  test("today view reflects week schedule data", async ({ page }) => {
    const today = getLocalDateKey();
    await seedStore(page, [
      {
        id: "e2e-today-box",
        title: "今日の会議",
        type: "fixed",
        date: today,
        startTime: "11:00",
        endTime: "12:00",
        isPooled: false,
      },
    ]);
    await page.goto("/today");
    await page.waitForSelector("[data-vision-day]", { timeout: 15_000 });
    await expect(page.getByText("今日の会議")).toBeVisible();
    await expect(page.getByText(/予定：.*1.*件/)).toBeVisible();
  });

  test("left horizontal duplicate from Wednesday to Monday", async ({ page }) => {
    const mon = mondayOfWeek();
    const wed = addDaysIso(mon, 2);
    await seedStore(page, [
      {
        id: "e2e-h-left-src",
        title: "左複製元",
        type: "asset",
        date: wed,
        startTime: "13:00",
        endTime: "14:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const source = page.locator("[data-schedule-box]").filter({ hasText: "左複製元" });
    await source.hover();
    const leftHandle = source.locator('[aria-label="左へドラッグして別の日へ複製"]');
    const monCell = page.locator(`[data-droppable-id="cell|${mon}|13:00|13:15"]`).first();

    await leftHandle.hover();
    await page.mouse.down();
    const monBox = await monCell.boundingBox();
    if (!monBox) throw new Error("monday cell not found");
    await page.mouse.move(monBox.x + 8, monBox.y + 8, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(page.locator("[data-schedule-box]").filter({ hasText: "左複製元" })).toHaveCount(3);
  });

  test("horizontal duplicate creates copies on both sides", async ({ page }) => {
    const mon = mondayOfWeek();
    const wed = addDaysIso(mon, 2);
    const boxId = "e2e-h-dup-src";
    await seedStore(page, [
      {
        id: boxId,
        title: "横複製元",
        type: "asset",
        date: wed,
        startTime: "10:00",
        endTime: "11:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const source = page.locator("[data-schedule-box]").filter({ hasText: "横複製元" });
    await source.hover();
    const rightHandle = source.locator('[aria-label="右へドラッグして別の日へ複製"]');
    const friCell = page.locator(`[data-droppable-id="cell|${addDaysIso(mon, 4)}|10:00|10:15"]`).first();

    await rightHandle.hover();
    await page.mouse.down();
    const friBox = await friCell.boundingBox();
    if (!friBox) throw new Error("friday cell not found");
    await page.mouse.move(friBox.x + 8, friBox.y + 8, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(page.locator("[data-schedule-box]").filter({ hasText: "横複製元" })).toHaveCount(3);
  });

  test("Delete key removes selected box and Redo works", async ({ page }) => {
    const mon = mondayOfWeek();
    await seedStore(page, [
      {
        id: "e2e-del-key",
        title: "Deleteキー対象",
        type: "fixed",
        date: mon,
        startTime: "15:00",
        endTime: "16:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const box = page.locator("[data-schedule-box]").filter({ hasText: "Deleteキー対象" });
    await box.click();
    await page.keyboard.press("Delete");
    await expect(box).toHaveCount(0);
    await page.getByRole("button", { name: "元に戻す" }).click();
    await expect(box).toBeVisible();
    await page.getByRole("button", { name: "やり直す" }).click();
    await expect(box).toHaveCount(0);
  });

  test("modal open prevents background box deletion", async ({ page }) => {
    const mon = mondayOfWeek();
    await seedStore(page, [
      {
        id: "e2e-modal-guard",
        title: "モーダル保護",
        type: "fixed",
        date: mon,
        startTime: "12:00",
        endTime: "13:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);

    const box = page.locator("[data-schedule-box]").filter({ hasText: "モーダル保護" });
    await box.click();
    await box.dblclick();
    await page.getByLabel("ボックス名").waitFor();
    await page.keyboard.press("Delete");
    const stillInStore = await page.evaluate(() => {
      const raw = localStorage.getItem("timecraft-storage-v1");
      return JSON.parse(raw!).state.boxes.some(
        (b: { id: string }) => b.id === "e2e-modal-guard",
      );
    });
    expect(stillInStore).toBe(true);
    await page.keyboard.press("Escape");
  });

  test("reload keeps seeded boxes", async ({ page }) => {
    const mon = mondayOfWeek();
    await seedStore(page, [
      {
        id: "e2e-persist",
        title: "永続化テスト",
        type: "fixed",
        date: mon,
        startTime: "16:00",
        endTime: "17:00",
        isPooled: false,
      },
    ]);
    await waitForPlanner(page);
    await page.reload();
    await page.waitForSelector("[data-week-planner]", { timeout: 15_000 });
    await expect(page.getByText("永続化テスト")).toBeVisible();
  });
});
