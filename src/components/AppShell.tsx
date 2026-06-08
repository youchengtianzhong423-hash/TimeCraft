"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_OPEN_KEY = "timecraft-nav-open-v1";

const NAV = [
  { href: "/", label: "週間スケジュール", icon: CalendarRange },
  { href: "/today", label: "今日ビュー", icon: CalendarDays },
  { href: "/reviews", label: "レビュー", icon: NotebookPen },
  { href: "/analytics", label: "分析", icon: LineChart },
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/import", label: "インポート", icon: Download },
  { href: "/settings", label: "設定", icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_OPEN_KEY);
      if (saved === "0") setNavOpen(false);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggleNav = () => {
    setNavOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(NAV_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "hidden md:flex relative shrink-0 flex-col border-r border-border bg-white transition-[width] duration-200 ease-out overflow-hidden",
          navOpen ? "w-64" : "w-[3.25rem]",
          !ready && "w-64",
        )}
      >
        <div
          className={cn(
            "border-b border-border shrink-0",
            navOpen ? "px-6 pt-7 pb-6" : "px-2 py-4 flex justify-center",
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 min-w-0",
              !navOpen && "justify-center",
            )}
            title="TimeCraft"
          >
            <span className="grid place-items-center h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
              <Sparkles size={18} />
            </span>
            {navOpen && (
              <div className="leading-tight min-w-0">
                <div className="text-base font-bold tracking-wide">TimeCraft</div>
                <div className="text-[11px] text-muted truncate">
                  時間をつくる、余白を設計する
                </div>
              </div>
            )}
          </Link>
        </div>

        <nav
          className={cn(
            "flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden",
            navOpen ? "px-3" : "px-1.5",
          )}
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center rounded-lg text-sm transition-colors",
                  navOpen
                    ? "gap-3 px-3 py-2.5"
                    : "justify-center p-2.5",
                  active
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <Icon size={18} className="shrink-0" />
                {navOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {navOpen && (
          <div className="m-3 mt-auto p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shrink-0">
            <div className="text-xs opacity-80 mb-1">TimeCraftの考え方</div>
            <div className="text-sm leading-relaxed">
              Vision に計画、Real に実績。
              <br />
              最優先は1日2〜3個に絞る。
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleNav}
          aria-expanded={navOpen}
          aria-label={navOpen ? "メニューを閉じる" : "メニューを開く"}
          className={cn(
            "absolute z-40 grid place-items-center rounded-full border border-border bg-white shadow-sm",
            "h-7 w-7 text-slate-600 hover:bg-slate-50 hover:text-indigo-600",
            "-right-3.5 top-24",
          )}
        >
          {navOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
              <Sparkles size={16} />
            </span>
            <span className="font-bold">TimeCraft</span>
          </Link>
        </header>
        <nav className="md:hidden border-b border-border bg-white px-2 py-2 flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap",
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
