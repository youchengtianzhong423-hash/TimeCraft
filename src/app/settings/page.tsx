"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { GoogleCalendarPanel } from "@/components/GoogleCalendarPanel";
import { HydrationGate } from "@/components/HydrationGate";
import { Button } from "@/components/ui/Button";
import { TemplatePanel } from "@/components/TemplatePanel";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import {
  fetchDiskBackup,
  flushDiskBackup,
  setPermitEmptyDiskBackup,
} from "@/lib/data-backup-client";
import { ArrowRight, ArchiveRestore, Check, Download, HardDrive, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/types";

const THEMES: { key: Theme; label: string; bg: string; card: string; text: string }[] = [
  { key: "white", label: "白",      bg: "#ffffff", card: "#f3f4f6", text: "#111827" },
  { key: "navy",  label: "ネイビー", bg: "#0f1e3d", card: "#16274f", text: "#dce8f8" },
  { key: "black", label: "黒",      bg: "#0d0d0d", card: "#1a1a1a", text: "#f0f0f0" },
];

export default function Page() {
  return (
    <HydrationGate>
      <SettingsPage />
    </HydrationGate>
  );
}

const SCHEDULE_START_HOURS = [4, 5, 6, 7, 8, 9, 10] as const;

function SettingsPage() {
  const resetAll = useTimeCraftStore((s) => s.resetAll);
  const boxes = useTimeCraftStore((s) => s.boxes);
  const theme = useTimeCraftStore((s) => s.theme);
  const setTheme = useTimeCraftStore((s) => s.setTheme);
  const scheduleStartHour = useTimeCraftStore((s) => s.scheduleStartHour);
  const setScheduleStartHour = useTimeCraftStore((s) => s.setScheduleStartHour);
  const [backupInfo, setBackupInfo] = useState<{
    dataDir: string | null;
    lastModified: string | null;
    boxCount: number;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const { backup, lastModified, dataDir } = await fetchDiskBackup();
      setBackupInfo({
        dataDir,
        lastModified,
        boxCount: backup?.state.boxes.length ?? 0,
      });
    })();
  }, [boxes.length]);
  const dailyReviews = useTimeCraftStore((s) => s.dailyReviews);
  const weeklyReviews = useTimeCraftStore((s) => s.weeklyReviews);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="設定"
        description="Google カレンダー連携、データ管理などの設定を行います。"
      />

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          テーマ
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ key, label, bg, card, text }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={cn(
                "relative rounded-2xl border-2 p-4 transition-all",
                theme === key
                  ? "border-indigo-500 shadow-md"
                  : "border-transparent hover:border-slate-200",
              )}
              style={{ background: bg }}
            >
              <div
                className="rounded-lg p-3 mb-3 shadow-sm"
                style={{ background: card }}
              >
                <div style={{ background: text, height: 6, borderRadius: 9999, marginBottom: 6, opacity: 0.7 }} />
                <div style={{ background: text, height: 4, borderRadius: 9999, opacity: 0.35, width: "60%" }} />
              </div>
              <div className="text-xs font-medium text-center" style={{ color: text }}>
                {label}
              </div>
              {theme === key && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-indigo-500 grid place-items-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          スケジュール表示
        </h2>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-slate-700 mb-3">
            週間スケジュールの開始時刻（18時間分が表示されます）
          </p>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_START_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setScheduleStartHour(h)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                  scheduleStartHour === h
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {h}:00
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">
            現在: {scheduleStartHour}:00 〜 {scheduleStartHour + 18 > 24 ? `翌${(scheduleStartHour + 18) % 24}:00` : `${scheduleStartHour + 18}:00`}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          タスクテンプレート
        </h2>
        <TemplatePanel />
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          外部連携
        </h2>
        <GoogleCalendarPanel />
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Obsidian インポート
        </h2>
        <Link
          href="/import"
          className="block rounded-2xl border border-border bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-violet-100 text-violet-700 shrink-0">
              <Download size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                Obsidian デイリーノートから取り込み
                <ArrowRight
                  size={14}
                  className="opacity-60 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
              <p className="text-xs text-muted mt-1">
                Obsidian Vault の <code>raw/02_Daily/</code>{" "}
                に書いた予定・タスクを、TimeCraft のボックスとして自動取り込みします。
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          自動バックアップ
        </h2>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-emerald-100 text-emerald-800 shrink-0">
              <HardDrive size={18} />
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                やることリスト・週間スケジュールは、変更のたびに{" "}
                <strong>PC 上にも自動保存</strong>されます（ブラウザとは別）。
              </p>
              <p className="text-xs text-muted font-mono break-all">
                {backupInfo?.dataDir ?? "%LOCALAPPDATA%\\TimeCraft\\data\\latest.json"}
              </p>
              {backupInfo?.lastModified ? (
                <p className="text-xs text-emerald-800">
                  最終保存:{" "}
                  {new Date(backupInfo.lastModified).toLocaleString("ja-JP")}{" "}
                  （{backupInfo.boxCount} 件のボックス）
                </p>
              ) : (
                <p className="text-xs text-amber-800">
                  まだディスク保存がありません。予定を1件追加すると作成されます。
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void flushDiskBackup().then(() => window.location.reload())}
            >
              今すぐバックアップ
            </Button>
            <Link href="/restore">
              <Button size="sm" variant="ghost">
                <ArchiveRestore size={14} />
                復元
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          データ
        </h2>
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {boxes.length}
              </div>
              <div className="text-xs text-muted">ボックス</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {dailyReviews.length}
              </div>
              <div className="text-xs text-muted">日次レビュー</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {weeklyReviews.length}
              </div>
              <div className="text-xs text-muted">週次レビュー</div>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                予定が消えたときは、Chrome に残ったバックアップから復元できます。
              </p>
              <Link href="/restore">
                <Button variant="secondary" size="sm">
                  <ArchiveRestore size={14} />
                  データ復元
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              画面上のデータのみ削除します。
              <strong> PC の自動バックアップは残る</strong>ため、復元ページから戻せます。
            </p>
            <Button
              variant="outline"
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
              onClick={() => {
                if (
                  confirm(
                    "画面上のデータを空にしますか？\n\nPC の自動バックアップ (latest.json) は残るので、あとから「データ復元」で戻せます。",
                  )
                ) {
                  setPermitEmptyDiskBackup(false);
                  resetAll();
                }
              }}
            >
              <Trash2 size={14} />
              すべて削除
            </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
