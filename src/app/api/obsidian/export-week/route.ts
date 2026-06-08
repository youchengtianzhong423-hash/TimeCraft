import { NextResponse } from "next/server";
import { checkVault } from "@/lib/obsidian-server";
import { exportWeekPlannerToObsidian } from "@/lib/obsidian-export-week";
import type { WeekPlannerNotes } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const vault = await checkVault();
    if (!vault.exists || !vault.isDirectory) {
      return NextResponse.json(
        { error: "Obsidian Vault が見つかりません。", vault },
        { status: 400 },
      );
    }
    if (!vault.dailyNoteDirExists) {
      return NextResponse.json(
        {
          error: "raw/02_Daily フォルダがありません。Vault 内に作成してください。",
          vault,
        },
        { status: 400 },
      );
    }

    const body = (await req.json()) as { planner?: WeekPlannerNotes };
    const planner = body.planner;
    if (!planner?.weekStart) {
      return NextResponse.json(
        { error: "planner.weekStart が必要です。" },
        { status: 400 },
      );
    }

    const result = await exportWeekPlannerToObsidian({
      weekStart: planner.weekStart,
      weeklyPriority: planner.weeklyPriority ?? "",
      microSuccess: planner.microSuccess ?? "",
      weeklyEvaluation: planner.weeklyEvaluation ?? "",
      dailyPriority: planner.dailyPriority ?? {},
      realReflection: planner.realReflection ?? {},
    });

    const wroteDays = result.days.filter((d) => d.updated).length;
    const skippedDays = result.days.filter((d) => d.skipped).length;

    return NextResponse.json({
      ok: true,
      vaultPath: vault.vaultPath,
      result,
      summary: {
        wroteDays,
        skippedDays,
        weeklyWritten: result.weekly.updated,
        sundayFile: result.weekly.path,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "書き出しに失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
