import { NextResponse } from "next/server";
import { listDailyNotes } from "@/lib/obsidian-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "30");
  try {
    const dates = await listDailyNotes(Number.isFinite(limit) ? limit : 30);
    return NextResponse.json({ dates });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
