"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { format } from "date-fns";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <ReviewsIndexPage />
    </HydrationGate>
  );
}

function ReviewsIndexPage() {
  const dailyReviews = useTimeCraftStore((s) => s.dailyReviews);
  const weeklyReviews = useTimeCraftStore((s) => s.weeklyReviews);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="レビュー"
        description="忙しさに流されず、自分の行動理由を定期的に確認しましょう。"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/reviews/daily"
          className="rounded-2xl border border-border bg-white p-6 hover:shadow-md transition-shadow group"
        >
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 mb-3">
            <CalendarDays size={18} />
          </div>
          <h2 className="font-semibold text-slate-900">日次レビュー</h2>
          <p className="mt-1 text-sm text-muted">
            1日の終わりに、できたこと・できなかったこと・明日改善することを記録します。
          </p>
          <div className="mt-3 text-xs text-indigo-600 flex items-center gap-1 group-hover:underline">
            開く <ArrowRight size={12} />
          </div>
          <div className="mt-3 text-[11px] text-muted">
            記録済み: {dailyReviews.length} 件
          </div>
        </Link>

        <Link
          href="/reviews/weekly"
          className="rounded-2xl border border-border bg-white p-6 hover:shadow-md transition-shadow group"
        >
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-violet-100 text-violet-700 mb-3">
            <CalendarRange size={18} />
          </div>
          <h2 className="font-semibold text-slate-900">週次レビュー</h2>
          <p className="mt-1 text-sm text-muted">
            一番良かったボックス、来週減らすこと・増やすこと、来週の最優先テーマを設計します。
          </p>
          <div className="mt-3 text-xs text-indigo-600 flex items-center gap-1 group-hover:underline">
            開く <ArrowRight size={12} />
          </div>
          <div className="mt-3 text-[11px] text-muted">
            記録済み: {weeklyReviews.length} 件
          </div>
        </Link>
      </div>

      {(dailyReviews.length > 0 || weeklyReviews.length > 0) && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            最近の記録
          </h3>
          <div className="rounded-2xl border border-border bg-white divide-y divide-border">
            {dailyReviews
              .slice(-5)
              .reverse()
              .map((r) => (
                <div key={r.id} className="p-4 text-sm flex justify-between">
                  <span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] mr-2">
                      日次
                    </span>
                    {format(new Date(r.date), "M月d日 (EEE)")}
                  </span>
                  <span className="text-muted text-xs">
                    満足度 {r.satisfactionScore}/5
                  </span>
                </div>
              ))}
            {weeklyReviews
              .slice(-5)
              .reverse()
              .map((r) => (
                <div key={r.id} className="p-4 text-sm flex justify-between">
                  <span>
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] mr-2">
                      週次
                    </span>
                    {format(new Date(r.weekStartDate), "M/d")} -{" "}
                    {format(new Date(r.weekEndDate), "M/d")}
                  </span>
                  <span className="text-muted text-xs">
                    {r.nextWeekPriority ?? "—"}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
