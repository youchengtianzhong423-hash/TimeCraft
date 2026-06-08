"use client";

import { useEffect, useRef } from "react";
import {
  fetchDiskBackup,
  flushDiskBackup,
  hasUserScheduleData,
  scheduleDiskBackup,
} from "@/lib/data-backup-client";
import { useHasHydrated, useTimeCraftStore } from "@/store/useTimeCraftStore";

/**
 * やることリスト・週間スケジュールを PC 上にも自動保存し、
 * localStorage が空のときはディスクから復元する。
 */
export function DataPersistence() {
  const hydrated = useHasHydrated();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;

    void (async () => {
      const state = useTimeCraftStore.getState();
      const localHasData = hasUserScheduleData(state);

      const { backup, lastModified } = await fetchDiskBackup();
      const diskHasData =
        backup &&
        (backup.state.boxes.length > 0 ||
          Object.keys(backup.state.weekPlannerByWeek).length > 0);

      if (!localHasData && diskHasData) {
        console.info(
          "[TimeCraft] Restoring from disk backup",
          lastModified ?? backup.savedAt,
        );
        useTimeCraftStore.getState().importBackupState(backup.state);
      }

      if (localHasData || diskHasData) {
        await flushDiskBackup(
          backup && !localHasData
            ? backup
            : undefined,
        );
      }

      const reconciled =
        useTimeCraftStore.getState().reconcileAllPoolRepeatPlacements();
      if (reconciled > 0) {
        console.info(
          `[TimeCraft] 繰り返しの週間配置を ${reconciled} 件修復しました`,
        );
        await flushDiskBackup();
      }
    })();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const unsub = useTimeCraftStore.subscribe((state) => {
      scheduleDiskBackup(state);
    });

    const onHide = () => {
      void flushDiskBackup();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });

    return () => {
      unsub();
      window.removeEventListener("pagehide", onHide);
    };
  }, [hydrated]);

  return null;
}
