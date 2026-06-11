"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { saveScheduleViewPreference } from "@/lib/viewPreference";

const VIEWS = [
  { href: "/today", label: "今日", view: "today" as const },
  { href: "/", label: "週間", view: "week" as const },
] as const;

export function ScheduleViewToggle() {
  const pathname = usePathname();

  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-0.5 text-xs">
      {VIEWS.map(({ href, label, view }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => saveScheduleViewPreference(view)}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-colors",
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
