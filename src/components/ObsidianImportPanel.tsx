"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/Button";
import { FieldRow, Input, Select } from "./ui/Field";
import { BOX_TYPES, getBoxTypeMeta } from "@/lib/boxTypes";
import type { BoxType } from "@/lib/types";
import type { ParsedBoxCandidate } from "@/lib/obsidian-parser";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { durationMinutes } from "@/lib/timeBlocks";
import { cn } from "@/lib/cn";

interface VaultStatus {
  vaultPath: string;
  exists: boolean;
  isDirectory: boolean;
  dailyNoteDir?: string;
  dailyNoteDirExists?: boolean;
  error?: string;
}

interface ParseResponse {
  source: string;
  markdown: string;
  scheduled: ParsedBoxCandidate[];
  tasks: ParsedBoxCandidate[];
  warnings: string[];
  error?: string;
}

/** プレビュー時の編集可能なボックス候補 */
interface EditableCandidate {
  id: string;
  selected: boolean;
  title: string;
  type: BoxType;
  startTime: string;
  endTime: string;
  date: string;
  isFromSchedule: boolean;
  source: string;
}

const newClientId = (): string =>
  `obs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function ObsidianImportPanel() {
  const addBox = useTimeCraftStore((s) => s.addBox);
  const today = format(new Date(), "yyyy-MM-dd");

  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<string>(today);
  const [importDate, setImportDate] = useState<string>(today);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  // 初回マウント：vault 状態 + 直近デイリーノート取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, d] = await Promise.all([
          fetch("/api/obsidian/status").then((r) => r.json()),
          fetch("/api/obsidian/daily-notes?limit=30").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setStatus(s);
        setDates(d.dates ?? []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "初期化に失敗しました");
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleParse = async () => {
    setParseLoading(true);
    setError(null);
    setCreatedCount(null);
    setParseResult(null);
    setCandidates([]);
    try {
      const r = await fetch(
        `/api/obsidian/parse?date=${encodeURIComponent(date)}`,
      );
      const data: ParseResponse = await r.json();
      if (!r.ok || data.error) {
        setError(data.error ?? "解析に失敗しました");
        return;
      }
      setParseResult(data);
      const list: EditableCandidate[] = [
        ...data.scheduled.map((c) => candidateToEditable(c, importDate, true)),
        ...data.tasks.map((c) => candidateToEditable(c, importDate, false)),
      ];
      setCandidates(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "予期せぬエラー");
    } finally {
      setParseLoading(false);
    }
  };

  const handleImport = () => {
    const selected = candidates.filter((c) => c.selected);
    let count = 0;
    for (const c of selected) {
      const planned = durationMinutes(c.startTime, c.endTime);
      if (planned <= 0) continue;
      addBox({
        title: c.title,
        type: c.type,
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        plannedDuration: planned,
        repeatRule: "none",
        notify: false,
        memo: `Obsidian から取り込み: ${c.source}`,
      });
      count++;
    }
    setCreatedCount(count);
    // 取り込み済みのものを未選択に
    setCandidates((prev) =>
      prev.map((c) => (c.selected ? { ...c, selected: false } : c)),
    );
  };

  const updateCandidate = (
    id: string,
    patch: Partial<EditableCandidate>,
  ) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const selectedCount = candidates.filter((c) => c.selected).length;
  const validSelectedCount = candidates.filter(
    (c) => c.selected && durationMinutes(c.startTime, c.endTime) > 0,
  ).length;

  const vaultOk = !!status?.exists && !!status?.isDirectory;

  return (
    <div className="space-y-4">
      {/* Vault 状態 */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                vaultOk
                  ? "bg-violet-100 text-violet-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              <FolderOpen size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                Obsidian Vault
              </h3>
              {statusLoading ? (
                <p className="text-xs text-muted mt-0.5">
                  接続を確認しています...
                </p>
              ) : status ? (
                <>
                  <p className="text-xs text-muted mt-0.5 break-all">
                    {status.vaultPath}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {vaultOk ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={12} />
                        接続OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        <AlertTriangle size={12} />
                        接続不可
                      </span>
                    )}
                    {status.dailyNoteDirExists !== undefined &&
                      (status.dailyNoteDirExists ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 size={12} />
                          raw/02_Daily 検出
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle size={12} />
                          raw/02_Daily が見つかりません
                        </span>
                      ))}
                  </div>
                  {status.error && (
                    <p className="text-xs text-rose-700 mt-1">
                      {status.error}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3">
          パスを変更するには <code>.env.local</code> の{" "}
          <code>OBSIDIAN_VAULT_PATH</code> を設定して開発サーバを再起動してください。
        </p>
      </div>

      {!vaultOk ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Obsidian Vault に接続できないため、インポート機能は利用できません。
        </div>
      ) : (
        <>
          {/* 読み込み元の選択 */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">
                読み込み元のデイリーノート
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <FieldRow label="日付" hint="raw/02_Daily/YYYY-MM-DD.md を読み込みます">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                    className="w-44"
                  >
                    <option value="">直近30件から選ぶ</option>
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </div>
              </FieldRow>
              <FieldRow
                label="ボックスを追加する日付"
                hint="基本はノートと同じ日付。別日に振り替えるならここを変更"
              >
                <Input
                  type="date"
                  value={importDate}
                  onChange={(e) => {
                    setImportDate(e.target.value);
                    setCandidates((prev) =>
                      prev.map((c) => ({ ...c, date: e.target.value })),
                    );
                  }}
                />
              </FieldRow>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted">
                認識する書式は{" "}
                <a
                  href="#format-guide"
                  className="underline text-indigo-600"
                >
                  書式ガイド
                </a>{" "}
                を参照
              </div>
              <Button
                onClick={handleParse}
                disabled={parseLoading || !date}
              >
                <RefreshCw
                  size={14}
                  className={parseLoading ? "animate-spin" : ""}
                />
                {parseLoading ? "解析中..." : "解析する"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle size={14} />
                エラー
              </div>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {createdCount !== null && createdCount > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={14} />
              {createdCount} 個のボックスを作成しました。
            </div>
          )}

          {parseResult && candidates.length === 0 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <div className="flex items-center gap-1.5 font-medium">
                <FileText size={14} />
                ノートを読み込みましたが、ボックス候補は見つかりませんでした
              </div>
              <p className="text-xs mt-1">
                書式ガイドに沿ってデイリーノートに「## TimeCraft」セクションを追加してみてください。
              </p>
            </div>
          )}

          {/* 候補プレビュー */}
          {candidates.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">
                  ボックス候補（{candidates.length} 件）
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCandidates((prev) =>
                        prev.map((c) => ({ ...c, selected: true })),
                      )
                    }
                    className="text-indigo-600 hover:underline"
                  >
                    全選択
                  </button>
                  <span className="text-muted">/</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCandidates((prev) =>
                        prev.map((c) => ({ ...c, selected: false })),
                      )
                    }
                    className="text-slate-600 hover:underline"
                  >
                    全解除
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
                {candidates.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    onChange={(patch) => updateCandidate(c.id, patch)}
                  />
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
                <div className="text-xs text-muted">
                  選択中：
                  <span className="font-semibold text-slate-700">
                    {selectedCount}
                  </span>
                  {selectedCount !== validSelectedCount && (
                    <span className="ml-1 text-rose-600">
                      （うち時刻が不正：
                      {selectedCount - validSelectedCount}）
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleImport}
                  disabled={validSelectedCount === 0}
                >
                  <Sparkles size={14} />
                  選択した {validSelectedCount} 個をボックスとして追加
                </Button>
              </div>
            </div>
          )}

          {/* 書式ガイド */}
          <div
            id="format-guide"
            className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-900 space-y-2 leading-relaxed"
          >
            <div className="font-medium flex items-center gap-1.5">
              <CalendarDays size={14} />
              📝 デイリーノートに書くと自動でボックス化される書式
            </div>
            <pre className="bg-white/70 rounded p-2 text-[11px] overflow-x-auto whitespace-pre">
{`## TimeCraft        ← この見出し配下を解析

- 09:00-11:00 [優先] YouTube台本作成
- 13:00-14:00 [雑務] メール返信
- 15:00-17:00 [資産] アプリ開発
- 21:00-22:00 [回復] 散歩

## 今日のタスク      ← この見出し配下は「時間未指定タスク」

- [ ] 来週の企画を考える
- [ ] 銀行の手続き`}
            </pre>
            <ul className="list-disc list-inside pl-1 space-y-1">
              <li>
                認識する見出し：<code>TimeCraft</code> /
                <code>今日の予定</code> /<code>スケジュール</code> など
              </li>
              <li>
                タイプの指定：<code>[優先]</code> や{" "}
                <code>#priority</code>、タイトル内のキーワードでも自動判定
              </li>
              <li>
                時刻：<code>9:00-11:00</code> / <code>09:00〜11:00</code> / 全角コロンも可
              </li>
              <li>時間未指定は「タスク候補」としてプレビューで時刻を割り当て可能</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function candidateToEditable(
  c: ParsedBoxCandidate,
  date: string,
  fromSchedule: boolean,
): EditableCandidate {
  return {
    id: newClientId(),
    selected: true,
    title: c.title,
    type: c.type,
    startTime: c.startTime ?? "09:00",
    endTime: c.endTime ?? "11:00",
    date,
    isFromSchedule: fromSchedule,
    source: c.section ?? "",
  };
}

function CandidateRow({
  candidate,
  onChange,
}: {
  candidate: EditableCandidate;
  onChange: (patch: Partial<EditableCandidate>) => void;
}) {
  const meta = getBoxTypeMeta(candidate.type);
  const planned = durationMinutes(candidate.startTime, candidate.endTime);
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        candidate.selected
          ? `${meta.bg} ${meta.border}`
          : "bg-white border-slate-200",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={candidate.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="shrink-0"
        />
        <Input
          value={candidate.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-0"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2">
        <Select
          value={candidate.type}
          onChange={(e) =>
            onChange({ type: e.target.value as BoxType })
          }
        >
          {BOX_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.emoji} {t.shortLabel}
            </option>
          ))}
        </Select>
        <Input
          type="time"
          step={900}
          value={candidate.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
        />
        <Input
          type="time"
          step={900}
          value={candidate.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
        />
        <Input
          type="date"
          value={candidate.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <div className="flex items-center justify-end text-[11px] text-muted">
          {planned > 0 ? (
            `${planned}分`
          ) : (
            <span className="text-rose-600">時刻が不正</span>
          )}
        </div>
      </div>
      {candidate.source && (
        <div className="mt-1.5 text-[10px] text-muted">
          抽出元セクション：{candidate.source}
          {!candidate.isFromSchedule && " ・ タスクから抽出"}
        </div>
      )}
    </div>
  );
}
