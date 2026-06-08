import fs from "fs";
import path from "path";

const base =
  "C:/Users/yusei/AppData/Local/TimeCraft/ChromeProfile/Default/Local Storage/leveldb";

if (!fs.existsSync(base)) {
  console.log("leveldb not found:", base);
  process.exit(1);
}

const keywords = [
  "timecraft-storage",
  "YouTube",
  "ストック",
  "事務所",
  "勉強",
  '"boxes"',
];

for (const fn of fs.readdirSync(base)) {
  const fp = path.join(base, fn);
  const data = fs.readFileSync(fp);
  const text = data.toString("utf8");
  if (!keywords.some((k) => text.includes(k))) continue;
  console.log("\n===", fn, data.length, "bytes ===");
  const idx = text.indexOf("timecraft-storage");
  if (idx >= 0) {
    console.log(text.slice(Math.max(0, idx - 50), idx + 8000));
  }
  for (const k of ["YouTube", "ストック", "事務所", "AIの勉強"]) {
    const i = text.indexOf(k);
    if (i >= 0) console.log("found", k, "at", i, ":", text.slice(i, i + 80));
  }
}
