"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MemoFromTextPanel } from "@/components/MemoFromTextPanel";
import { ObsidianImportPanel } from "@/components/ObsidianImportPanel";
import { HydrationGate } from "@/components/HydrationGate";
import { cn } from "@/lib/cn";

export default function Page() {
  return (
    <HydrationGate>
      <ImportPage />
    </HydrationGate>
  );
}

function ImportPage() {
  const [obsidianOpen, setObsidianOpen] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="メモから時間を作る"
        description="やることや予定を文章で入力すると、TimeCraftのボックス候補に変換します"
      />

      <MemoFromTextPanel />

      <div className="mt-8 rounded-2xl border border-border bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setObsidianOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 grid place-items-center shrink-0">
              <FolderOpen size={16} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">
                Obsidian から読み込み
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                ローカル開発時のみ · Vault
                内のデイリーノートを入力元として使えます
              </div>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "text-muted shrink-0 transition-transform",
              obsidianOpen && "rotate-180",
            )}
          />
        </button>
        {obsidianOpen && (
          <div className="px-5 pb-5 pt-4 border-t border-border">
            <ObsidianImportPanel />
          </div>
        )}
      </div>
    </div>
  );
}
