"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TimeCraft]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">
          TimeCraft の表示でエラーが発生しました
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          予定データは PC 上の自動バックアップ（
          <code className="text-xs">%LOCALAPPDATA%\TimeCraft\data\</code>
          ）に残っています。ブラウザの保存データは自動では消しません。
        </p>
        <p className="mt-4 text-xs text-slate-500 font-mono break-all">
          {error.message}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            再試行
          </button>
          <Link
            href="/restore"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center"
          >
            データ復元ページを開く
          </Link>
        </div>
      </div>
    </div>
  );
}
