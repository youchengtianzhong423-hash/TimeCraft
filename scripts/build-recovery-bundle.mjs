/**
 * recovered-storage.json + ユーザー申告の欠落タスク → public/recovery-bundle.json
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const root = path.resolve("D:/AI開発/TimeCraft/timecraft");
const recovered = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/recovered-storage.json"), "utf8"),
);

const now = new Date().toISOString();
const today = "2026-05-29";

function poolBox(title, type, poolOrder) {
  return {
    id: randomUUID(),
    title,
    type,
    date: today,
    startTime: "08:00",
    endTime: "09:00",
    plannedDuration: 60,
    notify: false,
    repeatRule: "none",
    status: "notStarted",
    isPooled: true,
    poolOrder,
    createdAt: now,
    updatedAt: now,
  };
}

const existingTitles = new Set(recovered.state.boxes.map((b) => b.title));
const extra = [];
if (!existingTitles.has("ストック作成")) {
  extra.push(poolBox("ストック作成", "asset", 3));
}
if (!existingTitles.has("事務所へ出勤")) {
  extra.push(poolBox("事務所へ出勤", "fixed", 4));
}
if (!existingTitles.has("AIの勉強")) {
  extra.push(poolBox("AIの勉強", "priority", 5));
}

const bundle = {
  ...recovered,
  state: {
    ...recovered.state,
    boxes: [...recovered.state.boxes, ...extra],
  },
  _meta: {
    recoveredAt: now,
    source:
      "TimeCraft ChromeProfile LevelDB + 欠落3件をやることリストとして再登録",
    note: "ストック作成・事務所へ出勤・AIの勉強はバックアップに残っていなかったため新規IDで復元",
  },
};

const out = path.join(root, "public/recovery-bundle.json");
fs.writeFileSync(out, JSON.stringify(bundle, null, 2), "utf8");
console.log("Wrote", out);
console.log("boxes:", bundle.state.boxes.length);
console.log(
  "titles:",
  [...new Set(bundle.state.boxes.map((b) => b.title))].join(", "),
);
