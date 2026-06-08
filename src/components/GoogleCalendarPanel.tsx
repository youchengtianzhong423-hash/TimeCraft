"use client";

import { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/Button";
import { FieldRow, Select } from "./ui/Field";
import { useGoogleConfig } from "./GoogleProvider";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import {
  GOOGLE_OAUTH_SCOPE,
  isTokenValid,
  listCalendars,
} from "@/lib/google-calendar";
import { syncFromGoogleCalendar } from "@/lib/google-sync";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/cn";

export function GoogleCalendarPanel() {
  const { isConfigured } = useGoogleConfig();

  if (!isConfigured) {
    return <SetupInstructions />;
  }

  return <GoogleCalendarPanelInner />;
}

function GoogleCalendarPanelInner() {
  const auth = useTimeCraftStore((s) => s.googleAuth);
  const sync = useTimeCraftStore((s) => s.googleSync);
  const setGoogleAuth = useTimeCraftStore((s) => s.setGoogleAuth);
  const clearGoogleAuth = useTimeCraftStore((s) => s.clearGoogleAuth);
  const setGoogleSync = useTimeCraftStore((s) => s.setGoogleSync);
  const setAvailableCalendars = useTimeCraftStore(
    (s) => s.setAvailableCalendars,
  );
  const toggleCalendarSelection = useTimeCraftStore(
    (s) => s.toggleCalendarSelection,
  );

  const connected = !!auth.accessToken && isTokenValid(auth.expiresAt);
  const tokenExpired = !!auth.accessToken && !isTokenValid(auth.expiresAt);
  const googleBoxCount = useTimeCraftStore(
    (s) => s.boxes.filter((b) => !!b.googleEventId).length,
  );

  const [loading, setLoading] = useState<"none" | "calendars" | "sync">(
    "none",
  );
  const [error, setError] = useState<string | null>(null);

  const login = useGoogleLogin({
    scope: GOOGLE_OAUTH_SCOPE,
    onSuccess: async (response) => {
      const expiresAt = Date.now() + response.expires_in * 1000;
      setGoogleAuth({
        accessToken: response.access_token,
        expiresAt,
      });
      setError(null);
      await refreshCalendars(response.access_token);
    },
    onError: (e) => {
      setError(`Google ログインに失敗しました: ${e.error_description ?? ""}`);
    },
  });

  const refreshCalendars = async (token: string) => {
    setLoading("calendars");
    setError(null);
    try {
      const cals = await listCalendars(token);
      setAvailableCalendars(cals);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "カレンダー一覧の取得に失敗しました",
      );
    } finally {
      setLoading("none");
    }
  };

  const handleSync = async () => {
    setLoading("sync");
    setError(null);
    const result = await syncFromGoogleCalendar();
    if (result.error) setError(result.error);
    setLoading("none");
  };

  // 初回マウント時にトークン有効なら一覧を取得
  useEffect(() => {
    if (
      connected &&
      auth.accessToken &&
      sync.availableCalendars.length === 0
    ) {
      void refreshCalendars(auth.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* 接続状態カード */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl grid place-items-center",
                connected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              <CalendarCheck2 size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Google カレンダー連携
              </h3>
              <p className="text-xs text-muted mt-0.5">
                既存の予定を「固定ボックス」として TimeCraft に取り込みます。
                <br />
                権限：カレンダーの読み取りのみ（変更・削除はしません）。
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {connected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={12} />
                    接続中
                  </span>
                )}
                {tokenExpired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle size={12} />
                    トークン期限切れ
                  </span>
                )}
                {!auth.accessToken && (
                  <span className="text-muted">未接続</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {!connected ? (
              <Button onClick={() => login()}>
                {tokenExpired ? "再接続" : "Google で接続"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Google カレンダー連携を切断しますか？")) {
                    clearGoogleAuth();
                  }
                }}
              >
                <LogOut size={14} />
                切断
              </Button>
            )}
          </div>
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

      {/* カレンダー選択 */}
      {connected && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">
              同期するカレンダー
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => auth.accessToken && refreshCalendars(auth.accessToken)}
              disabled={loading === "calendars"}
            >
              <RefreshCw
                size={12}
                className={loading === "calendars" ? "animate-spin" : ""}
              />
              一覧を更新
            </Button>
          </div>
          {sync.availableCalendars.length === 0 ? (
            <p className="text-xs text-muted">
              {loading === "calendars"
                ? "カレンダーを取得しています..."
                : "カレンダーが見つかりませんでした。"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {sync.availableCalendars.map((c) => {
                const checked = sync.selectedCalendarIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      checked
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCalendarSelection(c.id)}
                    />
                    {c.backgroundColor && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.backgroundColor }}
                      />
                    )}
                    <span className="text-sm text-slate-800 flex-1 truncate">
                      {c.summary}
                    </span>
                    {c.primary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        メイン
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <FieldRow label="取得する過去の週数">
              <Select
                value={sync.pastWeeks}
                onChange={(e) =>
                  setGoogleSync({ pastWeeks: Number(e.target.value) })
                }
              >
                <option value={0}>今週から</option>
                <option value={1}>1週前から</option>
                <option value={2}>2週前から</option>
                <option value={4}>4週前から</option>
              </Select>
            </FieldRow>
            <FieldRow label="取得する未来の週数">
              <Select
                value={sync.futureWeeks}
                onChange={(e) =>
                  setGoogleSync({ futureWeeks: Number(e.target.value) })
                }
              >
                <option value={1}>1週先まで</option>
                <option value={2}>2週先まで</option>
                <option value={4}>4週先まで</option>
                <option value={8}>8週先まで</option>
                <option value={12}>12週先まで</option>
              </Select>
            </FieldRow>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
            <div className="text-xs text-muted">
              <div>
                取り込み済み：
                <span className="font-semibold text-slate-700">
                  {googleBoxCount}
                </span>{" "}
                件のボックス
              </div>
              {sync.lastSyncedAt && (
                <div className="mt-0.5">
                  最終同期：
                  {format(
                    new Date(sync.lastSyncedAt),
                    "yyyy/M/d HH:mm",
                    { locale: ja },
                  )}
                  {sync.lastSyncSummary && (
                    <span className="ml-1">
                      （新規 {sync.lastSyncSummary.created} / 更新{" "}
                      {sync.lastSyncSummary.updated} / 据置{" "}
                      {sync.lastSyncSummary.skipped}）
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={handleSync}
              disabled={
                loading === "sync" ||
                sync.selectedCalendarIds.length === 0
              }
            >
              <RefreshCw
                size={14}
                className={loading === "sync" ? "animate-spin" : ""}
              />
              {loading === "sync" ? "同期中..." : "今すぐ同期"}
            </Button>
          </div>
        </div>
      )}

      {/* 仕様メモ */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 space-y-1.5 leading-relaxed">
        <div className="font-medium">📌 取り込み仕様</div>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>イベントは「固定ボックス」として取り込まれます</li>
          <li>同じイベントは再同期しても重複しません（更新のみ）</li>
          <li>
            手動で編集したボックスは、次回同期で上書きされません
          </li>
          <li>同日内のイベントのみ取り込みます（日跨ぎはスキップ）</li>
          <li>終日イベントは 00:00〜23:59 として取り込みます</li>
          <li>権限：読み取りのみ。Google 側の予定は変更されません</li>
        </ul>
      </div>
    </div>
  );
}

function SetupInstructions() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900">
            Google Cloud のクライアント ID が設定されていません
          </h3>
          <p className="text-sm text-amber-800 mt-1">
            Google カレンダー連携を有効にするには、Google Cloud Console で
            OAuth クライアント ID を発行し、環境変数に設定してください。
          </p>
          <ol className="mt-3 text-xs text-amber-900 space-y-1.5 list-decimal list-inside">
            <li>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console <ExternalLink size={10} />
              </a>{" "}
              でプロジェクトを作成
            </li>
            <li>
              「API とサービス」→「ライブラリ」で
              <span className="font-medium">Google Calendar API</span>
              を有効化
            </li>
            <li>
              「OAuth 同意画面」を設定（ユーザータイプ：外部 / テストユーザーに自分を追加）
            </li>
            <li>
              「認証情報」→「認証情報を作成」→「OAuth クライアント ID」（ウェブアプリケーション）
            </li>
            <li>
              <span className="font-medium">承認済みの JavaScript 生成元</span>
              に <code className="bg-amber-100 px-1 rounded">http://localhost:3100</code>{" "}
              を追加
            </li>
            <li>
              発行されたクライアント ID をプロジェクトルートの
              <code className="bg-amber-100 px-1 rounded">.env.local</code>{" "}
              に追加：
              <pre className="mt-1 bg-amber-100 rounded p-2 text-[11px] overflow-x-auto">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxxxx.apps.googleusercontent.com
              </pre>
            </li>
            <li>開発サーバーを再起動してこの画面を再読み込み</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
