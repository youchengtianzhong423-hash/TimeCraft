/**
 * Vercel / ブラウザ用アイコンを timecraft-icon-source.png から生成する。
 *
 * 出力:
 *   src/app/icon.png        (512x512, Next.js が favicon 等に自動変換)
 *   src/app/apple-icon.png  (180x180)
 *   public/favicon.ico
 *   public/icon-192.png
 *   public/icon-512.png
 *
 * Usage: node scripts/prepare-web-icons.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");
const source = path.join(publicDir, "timecraft-icon-source.png");
const transparent = path.join(publicDir, "timecraft-icon-transparent.png");
const prepare = path.join(__dirname, "prepare-app-icon.mjs");
const localIco = path.join(
  process.env.LOCALAPPDATA ?? "",
  "TimeCraft",
  "timecraft-icon.ico",
);

if (!existsSync(source)) {
  console.error("Missing source:", source);
  process.exit(1);
}

mkdirSync(appDir, { recursive: true });

execFileSync(process.execPath, [prepare, source, transparent], {
  stdio: "inherit",
});

const base = sharp(transparent);

await base.clone().png().toFile(path.join(appDir, "icon.png"));
await base
  .clone()
  .resize(180, 180)
  .png()
  .toFile(path.join(appDir, "apple-icon.png"));
await base
  .clone()
  .resize(192, 192)
  .png()
  .toFile(path.join(publicDir, "icon-192.png"));
await base
  .clone()
  .resize(512, 512)
  .png()
  .toFile(path.join(publicDir, "icon-512.png"));

const faviconOut = path.join(publicDir, "favicon.ico");
const projectIco = path.join(publicDir, "timecraft-icon.ico");
const icoSource =
  existsSync(localIco) && statSync(localIco).size > 500
    ? localIco
    : existsSync(projectIco) && statSync(projectIco).size > 500
      ? projectIco
      : null;

if (icoSource) {
  copyFileSync(icoSource, faviconOut);
  console.log("Copied favicon from", icoSource);
} else {
  const conv = path.join(__dirname, "Convert-PngToIco.ps1");
  if (existsSync(conv)) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        conv,
        "-SourcePath",
        transparent,
        "-IcoPath",
        faviconOut,
      ],
      { stdio: "inherit" },
    );
  }
}

console.log("Vercel/web icons ready:");
console.log("  src/app/icon.png");
console.log("  src/app/apple-icon.png");
console.log("  public/favicon.ico");
console.log("  public/icon-192.png");
console.log("  public/icon-512.png");
