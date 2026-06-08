"use client";

import { AlertTriangle, Check, Info, Lightbulb } from "lucide-react";
import { Diagnosis } from "@/lib/diagnose";
import { cn } from "@/lib/cn";

const STYLE: Record<Diagnosis["level"], { bg: string; text: string; icon: React.ReactNode }> = {
  ok: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    icon: <Check size={16} />,
  },
  info: {
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-800",
    icon: <Info size={16} />,
  },
  warning: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon: <Lightbulb size={16} />,
  },
  danger: {
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-800",
    icon: <AlertTriangle size={16} />,
  },
};

export function WarningBanner({ diagnosis }: { diagnosis: Diagnosis }) {
  const s = STYLE[diagnosis.level];
  return (
    <div className={cn("rounded-2xl border px-5 py-4", s.bg, s.text)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{s.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{diagnosis.title}</div>
          <p className="text-sm mt-1 leading-relaxed">{diagnosis.message}</p>
          {diagnosis.suggestions.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5 list-disc list-inside opacity-90">
              {diagnosis.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
