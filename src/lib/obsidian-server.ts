import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import path from "node:path";

const DEFAULT_VAULT_PATH = "D:\\ダウンロード\\Second Brain";

const VAULT_PATH_CANDIDATES = [
  DEFAULT_VAULT_PATH,
  path.join(process.env.USERPROFILE ?? "", "Downloads", "Second Brain"),
].filter(Boolean);

export const getVaultPath = (): string => {
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }

  return (
    VAULT_PATH_CANDIDATES.find((candidate) => fsSync.existsSync(candidate)) ??
    DEFAULT_VAULT_PATH
  );
};

export interface VaultStatus {
  vaultPath: string;
  exists: boolean;
  isDirectory: boolean;
  dailyNoteDir?: string;
  dailyNoteDirExists?: boolean;
  error?: string;
}

export async function checkVault(): Promise<VaultStatus> {
  const vaultPath = getVaultPath();
  try {
    const stat = await fs.stat(vaultPath);
    if (!stat.isDirectory()) {
      return {
        vaultPath,
        exists: true,
        isDirectory: false,
        error: "Vault path is not a folder.",
      };
    }

    const dailyNoteDir = path.join(vaultPath, "raw", "02_Daily");
    let dailyNoteDirExists = false;
    try {
      const d = await fs.stat(dailyNoteDir);
      dailyNoteDirExists = d.isDirectory();
    } catch {
      dailyNoteDirExists = false;
    }

    return {
      vaultPath,
      exists: true,
      isDirectory: true,
      dailyNoteDir,
      dailyNoteDirExists,
    };
  } catch (e) {
    return {
      vaultPath,
      exists: false,
      isDirectory: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function safeJoin(vaultPath: string, relPath: string): string | null {
  if (!relPath) return null;
  if (path.isAbsolute(relPath)) return null;

  const resolved = path.resolve(vaultPath, relPath);
  const vaultResolved = path.resolve(vaultPath);
  if (
    resolved !== vaultResolved &&
    !resolved.startsWith(vaultResolved + path.sep)
  ) {
    return null;
  }

  if (!resolved.toLowerCase().endsWith(".md")) return null;
  return resolved;
}

export async function readVaultMarkdown(relPath: string): Promise<string> {
  const vault = getVaultPath();
  const abs = safeJoin(vault, relPath);
  if (!abs) {
    throw new Error("指定されたパスはVault外、または.md以外です。");
  }

  return await fs.readFile(abs, "utf-8");
}

export async function readDailyNote(date: string): Promise<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("日付はYYYY-MM-DD形式で指定してください。");
  }

  const relPath = path.join("raw", "02_Daily", `${date}.md`);
  return await readVaultMarkdown(relPath);
}

export function dailyNoteAbsPath(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("日付はYYYY-MM-DD形式で指定してください。");
  }

  return path.join(getVaultPath(), "raw", "02_Daily", `${date}.md`);
}

export async function readDailyNoteOrEmpty(date: string): Promise<string> {
  try {
    return await readDailyNote(date);
  } catch {
    return "";
  }
}

export async function saveDailyNoteWithMarker(
  date: string,
  markerId: string,
  sectionBody: string,
  upsert: (existing: string, markerId: string, body: string) => string,
): Promise<{ path: string; updated: boolean }> {
  const body = sectionBody.trim();
  if (!body) {
    return {
      path: path.join("raw", "02_Daily", `${date}.md`),
      updated: false,
    };
  }

  const abs = dailyNoteAbsPath(date);
  await fs.mkdir(path.dirname(abs), { recursive: true });

  const existing = await readDailyNoteOrEmpty(date);
  const next = upsert(existing, markerId, body);
  await fs.writeFile(abs, next.endsWith("\n") ? next : `${next}\n`, "utf-8");

  return {
    path: path.join("raw", "02_Daily", `${date}.md`),
    updated: true,
  };
}

export async function listDailyNotes(limit = 30): Promise<string[]> {
  const vault = getVaultPath();
  const dir = path.join(vault, "raw", "02_Daily");
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse()
      .slice(0, limit)
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}
