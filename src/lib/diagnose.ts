import type { Box } from "./types";
import { durationMinutes, toMinutes } from "./timeBlocks";

export interface Diagnosis {
  level: "ok" | "info" | "warning" | "danger";
  title: string;
  message: string;
  suggestions: string[];
}

const sumDurationByType = (boxes: Box[], type: Box["type"]): number =>
  boxes
    .filter((b) => b.type === type && b.status !== "deleted")
    .reduce((acc, b) => acc + durationMinutes(b.startTime, b.endTime), 0);

/** 1日分の詰め込みすぎ診断 */
export const diagnoseDay = (dayBoxes: Box[]): Diagnosis => {
  const active = dayBoxes.filter((b) => b.status !== "deleted");
  if (active.length === 0) {
    return {
      level: "info",
      title: "まだ何も計画されていません",
      message:
        "まず固定ボックスから配置していきましょう。動かせない予定を入れたあとで、優先ボックス・余白ボックスを設計します。",
      suggestions: [
        "固定ボックスを置く",
        "優先ボックスを2〜3個に絞る",
        "1日2時間以上の余白を確保する",
      ],
    };
  }

  const priorityCount = active.filter((b) => b.type === "priority").length;
  const whitespaceMin = sumDurationByType(active, "whitespace");
  const recoveryMin = sumDurationByType(active, "recovery");
  const shallowBoxes = active.filter((b) => b.type === "shallowWork");
  const totalMin = active.reduce(
    (acc, b) => acc + durationMinutes(b.startTime, b.endTime),
    0,
  );

  const suggestions: string[] = [];
  let level: Diagnosis["level"] = "ok";
  let title = "バランスの取れた一日です";
  let message =
    "重要なことに時間を使えるだけの余白が確保されています。この調子でいきましょう。";

  if (priorityCount >= 4) {
    level = "danger";
    title = "優先ボックスが多すぎます";
    message =
      "本当に今日やるべきことを2〜3個に絞ると、実行しやすくなります。優先しすぎは結果的に何も終わらない原因になります。";
    suggestions.push("優先ボックスを2〜3個に減らす");
  }

  if (whitespaceMin < 120) {
    if (level !== "danger") {
      level = "warning";
      title = "今日の余白が少なすぎます";
      message =
        "予定を詰め込みすぎると、計画倒れしやすくなります。最低でも2時間の何もしない時間を確保しましょう。";
    }
    suggestions.push("余白ボックスを追加する（合計2時間以上）");
  }

  if (recoveryMin < 60) {
    if (level === "ok") {
      level = "info";
      title = "回復ボックスが少なめです";
      message =
        "睡眠以外の散歩・休憩・食事などの回復時間もスケジュールに組み込みましょう。";
    }
    suggestions.push("回復ボックスを30分以上追加する");
  }

  if (shallowBoxes.length >= 3) {
    if (level === "ok") {
      level = "warning";
      title = "雑務が分散しすぎています";
      message =
        "雑務はまとめて処理しましょう。重要タスクの集中時間を雑務に奪われないよう、1〜2枠に集約します。";
    }
    suggestions.push("雑務ボックスを1〜2枠に統合する");
  }

  if (totalMin > 60 * 14) {
    if (level === "ok" || level === "info") {
      level = "warning";
      title = "活動時間が長すぎます";
      message =
        "1日14時間以上を予定で埋めていませんか？人間は計画通りには動けません。空白を残しましょう。";
    }
    suggestions.push("ボックスを減らして余白を増やす");
  }

  const sorted = [...active].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  );
  const hasOverlap = sorted.some((b, i) => {
    if (i === 0) return false;
    return toMinutes(b.startTime) < toMinutes(sorted[i - 1].endTime);
  });
  if (hasOverlap) {
    if (level === "ok") level = "warning";
    title = title === "バランスの取れた一日です" ? "予定が重なっています" : title;
    message =
      message +
      (message.endsWith("。") ? "" : "。") +
      " 同じ時間帯に複数のボックスが重なっています。時間をずらすか、統合を検討してください。";
    suggestions.push("重なっているボックスの時間を調整する");
  }

  return { level, title, message, suggestions };
};

/** タイプ別の合計分（複数日分まとめ） */
export const aggregateByType = (boxes: Box[]) => {
  const active = boxes.filter((b) => b.status !== "deleted");
  return {
    fixed: sumDurationByType(active, "fixed"),
    priority: sumDurationByType(active, "priority"),
    asset: sumDurationByType(active, "asset"),
    recovery: sumDurationByType(active, "recovery"),
    shallowWork: sumDurationByType(active, "shallowWork"),
    whitespace: sumDurationByType(active, "whitespace"),
    date: sumDurationByType(active, "date"),
    reflection: sumDurationByType(active, "reflection"),
    offline: sumDurationByType(active, "offline"),
  };
};
