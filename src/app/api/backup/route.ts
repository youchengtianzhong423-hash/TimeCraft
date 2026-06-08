import { NextResponse } from "next/server";
import {
  getTimeCraftDataDir,
  readTimeCraftBackup,
  writeTimeCraftBackup,
} from "@/lib/data-backup-server";
import { isTimeCraftBackupFile } from "@/lib/data-backup-types";

export const runtime = "nodejs";

export async function GET() {
  const { backup, path, lastModified } = await readTimeCraftBackup();
  return NextResponse.json({
    ok: true,
    backup,
    path,
    lastModified,
    dataDir: getTimeCraftDataDir(),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!isTimeCraftBackupFile(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid backup payload" },
      { status: 400 },
    );
  }
  const result = await writeTimeCraftBackup(body);
  return NextResponse.json({
    ok: true,
    path: result.path,
    savedAt: result.savedAt,
    dataDir: getTimeCraftDataDir(),
  });
}
