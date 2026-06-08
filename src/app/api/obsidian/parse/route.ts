import { NextResponse } from "next/server";
import {
  readDailyNote,
  readVaultMarkdown,
} from "@/lib/obsidian-server";
import { parseObsidianMarkdown } from "@/lib/obsidian-parser";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const relPath = url.searchParams.get("path");

  try {
    let markdown: string;
    let source: string;
    if (date) {
      markdown = await readDailyNote(date);
      source = `raw/02_Daily/${date}.md`;
    } else if (relPath) {
      markdown = await readVaultMarkdown(relPath);
      source = relPath;
    } else {
      return NextResponse.json(
        { error: "date または path のいずれかを指定してください" },
        { status: 400 },
      );
    }

    const parsed = parseObsidianMarkdown(markdown);
    return NextResponse.json({
      source,
      markdown,
      ...parsed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 404 },
    );
  }
}
