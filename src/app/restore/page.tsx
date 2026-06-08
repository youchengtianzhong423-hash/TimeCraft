"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { HydrationGate } from "@/components/HydrationGate";
import { fetchDiskBackup, flushDiskBackup } from "@/lib/data-backup-client";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import type {
  Box,
  BoxTemplate,
  DailyReview,
  GoogleSyncSettings,
  WeeklyReview,
  WeekPlannerNotes,
} from "@/lib/types";
import { ArchiveRestore, CheckCircle2 } from "lucide-react";

interface RecoveryBundle {
  state: {
    boxes?: Box[];
    templates?: BoxTemplate[];
    weekPlannerByWeek?: Record<string, WeekPlannerNotes>;
    dailyReviews?: DailyReview[];
    weeklyReviews?: WeeklyReview[];
    googleSync?: GoogleSyncSettings;
  };
  _meta?: {
    recoveredAt?: string;
    source?: string;
    note?: string;
  };
}

export default function Page() {
  return (
    <HydrationGate>
      <RestorePage />
    </HydrationGate>
  );
}

function RestorePage() {
  const router = useRouter();
  const importRecoveredState = useTimeCraftStore((s) => s.importRecoveredState);
  const boxCount = useTimeCraftStore((s) => s.boxes.length);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  const loadBundle = useCallback(async (): Promise<RecoveryBundle> => {
    const disk = await fetchDiskBackup();
    if (disk.backup?.state?.boxes) {
      return { state: disk.backup.state };
    }
    const res = await fetch("/recovery-bundle.json");
    if (!res.ok) throw new Error("バックアップファイルが見つかりません");
    return (await res.json()) as RecoveryBundle;
  }, []);

  const loadPreview = useCallback(async () => {
    try {
      const data = await loadBundle();
      const titles = [
        ...new Set((data.state?.boxes ?? []).map((b) => b.title)),
      ];
      setPreview(titles);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, [loadBundle]);

  const runRestore = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const data = await loadBundle();
      const state = data.state;
      if (!state?.boxes) throw new Error("バックアップにボックスがありません");

      const current = useTimeCraftStore.getState();
      let result: { addedBoxes: number; replaced: boolean };
      if (current.boxes.length === 0) {
        useTimeCraftStore.getState().importBackupState({
          boxes: state.boxes,
          templates: state.templates,
          weekPlannerByWeek: state.weekPlannerByWeek,
          dailyReviews: state.dailyReviews,
          weeklyReviews: state.weeklyReviews,
          googleSync: state.googleSync,
        });
        result = { addedBoxes: state.boxes.length, replaced: true };
      } else {
        result = importRecoveredState({
          boxes: state.boxes,
          weekPlannerByWeek: state.weekPlannerByWeek,
        });
      }
      await flushDiskBackup();
      setStatus("done");
      setMessage(
        result.replaced
          ? `${result.addedBoxes}件のデータで置き換えました。週間ページを確認してください。`
          : `${result.addedBoxes}件を追加しました（既存データは残しています）。`,
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "復元に失敗しました");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <PageHeader
        title="データ復元"
        description="Chrome に残っていたバックアップから予定を戻します。"
      />

      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <p className="text-sm text-slate-600">
          現在のボックス数: <strong>{boxCount}</strong> 件
        </p>
        <p className="text-xs text-slate-500">
          デスクトップの TimeCraft と通常の Chrome では保存場所が別です。再起動後に空になった場合、ここから復元できます。
        </p>

        {preview.length > 0 ? (
          <ul className="text-sm text-slate-800 list-disc pl-5 space-y-0.5">
            {preview.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <Button variant="secondary" size="sm" onClick={loadPreview}>
            復元予定の一覧を表示
          </Button>
        )}

        <Button
          className="w-full"
          onClick={runRestore}
          disabled={status === "loading"}
        >
          <ArchiveRestore size={16} />
          {status === "loading" ? "復元中…" : "バックアップから復元する"}
        </Button>

        {message ? (
          <p
            className={`text-sm flex items-start gap-2 ${status === "done" ? "text-emerald-700" : "text-rose-700"}`}
          >
            {status === "done" ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : null}
            {message}
          </p>
        ) : null}

        {status === "done" ? (
          <Button className="w-full" onClick={() => router.push("/")}>
            週間スケジュールを開く
          </Button>
        ) : null}
      </div>
    </div>
  );
}
