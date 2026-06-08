import fs from "fs";
import path from "path";

const targets = ["ストック", "事務所", "AIの勉強", "YouTubeショート", "timecraft-storage"];

function decodeUtf16Le(buf) {
  let out = "";
  for (let i = 0; i < buf.length - 1; i += 2) {
    const code = buf[i] | (buf[i + 1] << 8);
    if (code >= 0x20 && code < 0xfffe) out += String.fromCharCode(code);
  }
  return out;
}

function scanDir(dir, depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "leveldb" && dir.includes("Local Storage")) {
        scanLeveldb(fp);
      } else if (!e.name.startsWith(".") && depth < 6) {
        scanDir(fp, depth + 1);
      }
    }
  }
}

function scanLeveldb(dir) {
  for (const fn of fs.readdirSync(dir)) {
    if (fn === "LOCK") continue;
    const fp = path.join(dir, fn);
    try {
      const buf = fs.readFileSync(fp);
      const text = decodeUtf16Le(buf);
      if (targets.some((t) => text.includes(t))) {
        console.log("HIT:", fp);
        for (const t of targets) {
          if (text.includes(t)) console.log("  contains:", t);
        }
      }
    } catch {
      /* */
    }
  }
}

const roots = [
  "C:/Users/yusei/AppData/Local/TimeCraft/ChromeProfile",
  "C:/Users/yusei/AppData/Local/Google/Chrome/User Data",
];
for (const r of roots) {
  console.log("\n=== scanning", r, "===");
  scanDir(r);
}
