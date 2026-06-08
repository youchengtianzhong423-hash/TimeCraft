import fs from "fs";
import path from "path";

const dir =
  "C:/Users/yusei/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb";

function dec(buf) {
  let o = "";
  for (let i = 0; i < buf.length - 1; i += 2) {
    const c = buf[i] | (buf[i + 1] << 8);
    if (c >= 32 && c < 65534) o += String.fromCharCode(c);
  }
  return o;
}

const needles = [
  "timecraft-storage",
  "ストック作成",
  "事務所へ",
  "AIの勉強",
  "YouTubeショート",
];

for (const fn of fs.readdirSync(dir)) {
  if (fn === "LOCK") continue;
  const fp = path.join(dir, fn);
  let o;
  try {
    o = dec(fs.readFileSync(fp));
  } catch {
    continue;
  }
  const hits = needles.filter((n) => o.includes(n));
  if (!hits.length) continue;
  console.log("\n---", fn, "---");
  console.log("hits:", hits.join(", "));
  const i = o.indexOf('{"state"');
  if (i >= 0) {
    let depth = 0;
    let end = -1;
    for (let j = i; j < o.length; j++) {
      if (o[j] === "{") depth++;
      else if (o[j] === "}") {
        depth--;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    if (end > i) {
      try {
        const p = JSON.parse(o.slice(i, end));
        const titles = [...new Set(p.state?.boxes?.map((b) => b.title) ?? [])];
        console.log("parsed boxes:", p.state?.boxes?.length, titles);
      } catch (e) {
        console.log("parse fail", e.message);
      }
    }
  }
}
