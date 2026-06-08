/**
 * Chrome Local Storage leveldb から TimeCraft データを抽出
 */
import fs from "fs";
import path from "path";

const SOURCES = [
  "C:/Users/yusei/AppData/Local/TimeCraft/ChromeProfile/Default/Local Storage/leveldb",
  "C:/Users/yusei/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb",
];

function decodeUtf16Le(buf) {
  let out = "";
  for (let i = 0; i < buf.length - 1; i += 2) {
    const code = buf[i] | (buf[i + 1] << 8);
    if (code >= 0x20 && code < 0xfffe) out += String.fromCharCode(code);
  }
  return out;
}

function extractJsonPayload(text) {
  const payloads = [];
  let idx = 0;
  while (true) {
    const start = text.indexOf('{"state"', idx);
    if (start < 0) break;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end > start) {
      try {
        payloads.push(JSON.parse(text.slice(start, end)));
      } catch {
        /* skip */
      }
    }
    idx = start + 20;
  }
  return payloads;
}

function boxCount(p) {
  return p?.state?.boxes?.length ?? 0;
}

function mergePayloads(payloads) {
  const sorted = [...payloads].sort((a, b) => boxCount(b) - boxCount(a));
  const byId = new Map();
  let bestPlanner = {};
  for (const p of sorted) {
    for (const b of p.state?.boxes ?? []) {
      if (!byId.has(b.id)) byId.set(b.id, b);
    }
    if (Object.keys(p.state?.weekPlannerByWeek ?? {}).length > Object.keys(bestPlanner).length) {
      bestPlanner = p.state.weekPlannerByWeek;
    }
  }
  const base = sorted[0] ?? { state: {} };
  return {
    state: {
      boxes: [...byId.values()],
      templates: base.state?.templates ?? [],
      dailyReviews: base.state?.dailyReviews ?? [],
      weeklyReviews: base.state?.weeklyReviews ?? [],
      googleAuth: base.state?.googleAuth ?? { accessToken: null, expiresAt: null },
      googleSync: base.state?.googleSync ?? {
        selectedCalendarIds: [],
        availableCalendars: [],
        lastSyncedAt: null,
        pastWeeks: 1,
        futureWeeks: 4,
      },
      weekPlannerByWeek: bestPlanner,
    },
    version: base.version ?? 0,
  };
}

function readLeveldb(dir) {
  let combined = "";
  if (!fs.existsSync(dir)) return combined;
  for (const fn of fs.readdirSync(dir)) {
    if (fn === "LOCK" || fn === "CURRENT") continue;
    try {
      combined += decodeUtf16Le(fs.readFileSync(path.join(dir, fn))) + "\n";
    } catch (e) {
      console.warn("skip", path.join(dir, fn), e.message);
    }
  }
  return combined;
}

const allPayloads = [];
for (const dir of SOURCES) {
  const text = readLeveldb(dir);
  const payloads = extractJsonPayload(text);
  console.log(path.basename(path.dirname(path.dirname(dir))), "→", payloads.length, "snapshots");
  for (const p of payloads) {
    const titles = [...new Set((p.state?.boxes ?? []).map((b) => b.title))];
    console.log("  ", boxCount(p), "boxes:", titles.join(", "));
  }
  allPayloads.push(...payloads);
}

const merged = mergePayloads(allPayloads);
const out = path.resolve("D:/AI開発/TimeCraft/timecraft/scripts/recovered-storage.json");
fs.writeFileSync(out, JSON.stringify(merged, null, 2), "utf8");

const uniqueTitles = [...new Set(merged.state.boxes.map((b) => b.title))];
console.log("\nMerged:", merged.state.boxes.length, "boxes");
console.log("Titles:", uniqueTitles.join(", "));
console.log("Wrote:", out);
