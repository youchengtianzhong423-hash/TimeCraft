"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ObsidianImportPanel } from "@/components/ObsidianImportPanel";
import { HydrationGate } from "@/components/HydrationGate";

export default function Page() {
  return (
    <HydrationGate>
      <ImportPage />
    </HydrationGate>
  );
}

function ImportPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="インポート"
        description="Obsidian のデイリーノートから、自動でボックスを取り込みます。"
      />
      <ObsidianImportPanel />
    </div>
  );
}
