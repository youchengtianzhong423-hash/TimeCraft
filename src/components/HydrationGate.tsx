"use client";

import { useHasHydrated } from "@/store/useTimeCraftStore";

/** localStorage からデータを復元するまで子要素を描画しない。
 *  Hydration mismatch を避けつつ、初期表示を綺麗に出すためのゲート。 */
export function HydrationGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hydrated = useHasHydrated();
  if (!hydrated) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        {fallback ?? (
          <div className="space-y-4">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="h-4 w-96 rounded bg-slate-200" />
            <div className="grid grid-cols-4 gap-3 mt-6">
              <div className="h-20 rounded-xl bg-slate-200" />
              <div className="h-20 rounded-xl bg-slate-200" />
              <div className="h-20 rounded-xl bg-slate-200" />
              <div className="h-20 rounded-xl bg-slate-200" />
            </div>
            <div className="h-64 rounded-2xl bg-slate-200 mt-6" />
          </div>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
