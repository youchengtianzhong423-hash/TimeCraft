import { promises as fs } from "node:fs";
import path from "node:path";
import type { TimeCraftBackupFile } from "@/lib/data-backup-types";
import { isTimeCraftBackupFile } from "@/lib/data-backup-types";

const HISTORY_MAX = 72;

export function getTimeCraftDataDir(): string {
  const base =
    process.env.TIMECRAFT_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || "", "TimeCraft", "data");
  return base;
}

function latestPath(): string {
  return path.join(getTimeCraftDataDir(), "latest.json");
}

function historyDir(): string {
  return path.join(getTimeCraftDataDir(), "history");
}

async function pruneHistory(): Promise<void> {
  const dir = historyDir();
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return;
  }
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();
  const excess = jsonFiles.length - HISTORY_MAX;
  if (excess <= 0) return;
  for (const f of jsonFiles.slice(0, excess)) {
    await fs.unlink(path.join(dir, f)).catch(() => {});
  }
}

/** 原子的に latest.json を更新し、1時間に1つ history も残す */
export async function writeTimeCraftBackup(
  payload: TimeCraftBackupFile,
): Promise<{ path: string; savedAt: string }> {
  const dir = getTimeCraftDataDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(historyDir(), { recursive: true });

  const body = JSON.stringify(payload, null, 2);
  const target = latestPath();
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, target);

  const hourKey = payload.savedAt.slice(0, 13).replace(/:/g, "-");
  const histFile = path.join(historyDir(), `${hourKey}.json`);
  try {
    await fs.access(histFile);
  } catch {
    await fs.writeFile(histFile, body, "utf8");
    await pruneHistory();
  }

  return { path: target, savedAt: payload.savedAt };
}

export async function readTimeCraftBackup(): Promise<{
  backup: TimeCraftBackupFile | null;
  path: string;
  lastModified: string | null;
}> {
  const target = latestPath();
  try {
    const raw = await fs.readFile(target, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isTimeCraftBackupFile(parsed)) {
      return { backup: null, path: target, lastModified: null };
    }
    const stat = await fs.stat(target);
    return {
      backup: parsed,
      path: target,
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return { backup: null, path: target, lastModified: null };
  }
}
