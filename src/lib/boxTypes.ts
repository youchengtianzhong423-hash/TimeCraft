import type { BoxType } from "./types";

export interface BoxTypeMeta {
  type: BoxType;
  label: string;
  shortLabel: string;
  description: string;
  /** Tailwind 用カラーパレット（背景・枠・テキスト） */
  bg: string;
  bgSoft: string;
  border: string;
  text: string;
  dot: string;
  emoji: string;
}

export const BOX_TYPES: BoxTypeMeta[] = [
  {
    type: "fixed",
    label: "固定ボックス",
    shortLabel: "固定",
    description: "動かせない予定（仕事・打ち合わせ・通院など）",
    bg: "bg-slate-100",
    bgSoft: "bg-slate-50",
    border: "border-slate-300",
    text: "text-slate-700",
    dot: "bg-slate-500",
    emoji: "📌",
  },
  {
    type: "priority",
    label: "優先ボックス",
    shortLabel: "優先",
    description: "今日・今週の最重要タスク（1日2〜3個まで）",
    bg: "bg-rose-100",
    bgSoft: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-700",
    dot: "bg-rose-500",
    emoji: "🔥",
  },
  {
    type: "asset",
    label: "資産ボックス",
    shortLabel: "資産",
    description: "未来の自由・収益につながる活動",
    bg: "bg-amber-100",
    bgSoft: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    dot: "bg-amber-500",
    emoji: "💎",
  },
  {
    type: "recovery",
    label: "回復ボックス",
    shortLabel: "回復",
    description: "睡眠・食事・運動・休憩など心身の回復",
    bg: "bg-emerald-100",
    bgSoft: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    emoji: "🌿",
  },
  {
    type: "shallowWork",
    label: "雑務ボックス",
    shortLabel: "雑務",
    description: "メール・LINE返信などのシャローワークを一括処理",
    bg: "bg-zinc-100",
    bgSoft: "bg-zinc-50",
    border: "border-zinc-300",
    text: "text-zinc-700",
    dot: "bg-zinc-500",
    emoji: "📨",
  },
  {
    type: "whitespace",
    label: "余白ボックス",
    shortLabel: "余白",
    description: "何をするか決めない自由時間（1日2時間以上推奨）",
    bg: "bg-sky-100",
    bgSoft: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-700",
    dot: "bg-sky-500",
    emoji: "☁️",
  },
  {
    type: "date",
    label: "デートボックス",
    shortLabel: "デート",
    description: "大切な人との時間",
    bg: "bg-pink-100",
    bgSoft: "bg-pink-50",
    border: "border-pink-300",
    text: "text-pink-700",
    dot: "bg-pink-500",
    emoji: "💗",
  },
  {
    type: "reflection",
    label: "内省ボックス",
    shortLabel: "内省",
    description: "日記・週次レビュー・目標見直しなど",
    bg: "bg-violet-100",
    bgSoft: "bg-violet-50",
    border: "border-violet-300",
    text: "text-violet-700",
    dot: "bg-violet-500",
    emoji: "🪞",
  },
  {
    type: "offline",
    label: "オンラインデトックス",
    shortLabel: "デトックス",
    description: "スマホ・SNSを使わない時間",
    bg: "bg-teal-100",
    bgSoft: "bg-teal-50",
    border: "border-teal-300",
    text: "text-teal-700",
    dot: "bg-teal-500",
    emoji: "🌙",
  },
];

const META_MAP: Record<BoxType, BoxTypeMeta> = BOX_TYPES.reduce(
  (acc, m) => {
    acc[m.type] = m;
    return acc;
  },
  {} as Record<BoxType, BoxTypeMeta>,
);

export const getBoxTypeMeta = (type: BoxType): BoxTypeMeta => META_MAP[type];
