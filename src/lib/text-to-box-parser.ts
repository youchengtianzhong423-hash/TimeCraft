import {
  addDays,
  format,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
} from "date-fns";
import { toISODate } from "@/lib/date";
import { minutesToHHmm, toMinutes } from "@/lib/timeBlocks";
import type { BoxType } from "@/lib/types";
import type { BoxPriority, ParsedTextBox, TextParseResult } from "./text-box-types";

const TIME_PERIOD: Record<string, { start: string; end: string }> = {
  午前中: { start: "09:00", end: "12:00" },
  午後: { start: "13:00", end: "17:00" },
  夕方: { start: "17:00", end: "19:00" },
  夜: { start: "19:00", end: "22:00" },
};

const FIXED_PHRASES = [
  "zoom",
  "病院",
  "打ち合わせ",
  "打合せ",
  "待ち合わせ",
  "ミーティング",
  "mtg",
  "会議",
  "通院",
  "予約",
];

const TYPE_RULES: { type: BoxType; phrases: string[]; weight?: number }[] = [
  {
    type: "fixed",
    phrases: [
      ...FIXED_PHRASES,
      "固定",
      "予定あり",
    ],
    weight: 2,
  },
  {
    type: "priority",
    phrases: [
      "今日中",
      "今週中",
      "明日まで",
      "終わらせる",
      "確認する",
      "最優先",
      "締切",
      "締め切り",
      "動画編集",
    ],
  },
  {
    type: "asset",
    phrases: [
      "youtube",
      "ユーチューブ",
      "ホロライブ",
      "企画",
      "台本",
      "チャンネル分析",
      "分析する",
      "投稿案",
      "timecraft",
      "発信",
      "コンテンツ",
      "学習",
      "勉強",
    ],
  },
  {
    type: "recovery",
    phrases: [
      "散歩",
      "昼寝",
      "休憩",
      "卓球",
      "風呂",
      "入浴",
      "睡眠",
      "食事",
      "ランチ",
      "ストレッチ",
      "運動",
    ],
  },
  {
    type: "shallowWork",
    phrases: [
      "請求書",
      "メール",
      "返信",
      "買い物",
      "ファイル整理",
      "整理する",
      "事務",
      "雑務",
      "振込",
    ],
  },
  {
    type: "whitespace",
    phrases: [
      "何もしない",
      "予定を入れない",
      "予定なし",
      "ゆっくり",
      "空けておく",
      "余白",
      "休む",
    ],
  },
  {
    type: "date",
    phrases: ["デート", "家族", "友人", "パートナー", "食事会"],
  },
  {
    type: "reflection",
    phrases: ["日記", "振り返り", "内省", "レビュー"],
  },
  {
    type: "offline",
    phrases: ["デトックス", "オフライン", "スマホ禁止", "sns禁止"],
  },
];

const HEADING_ONLY =
  /^(今日やること|やること|todo|to\s*do|tasks?|予定|メモ|schedule)$/i;

const padHHMM = (h: number, m: number): string =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

function weekdayResolver(day: number): (d: Date) => Date {
  const map = [
    nextSunday,
    nextMonday,
    nextTuesday,
    nextWednesday,
    nextThursday,
    nextFriday,
    nextSaturday,
  ];
  return map[day] ?? nextMonday;
}

function parseDateHint(
  text: string,
  ref: Date,
): { date: string | null; vague: boolean; rest: string } {
  let rest = text;
  let date: string | null = null;
  let vague = false;

  const rules: { re: RegExp; resolve: () => string | null; vague?: boolean }[] = [
    { re: /今日/g, resolve: () => toISODate(ref) },
    { re: /明日/g, resolve: () => toISODate(addDays(ref, 1)) },
    { re: /明後日/g, resolve: () => toISODate(addDays(ref, 2)) },
    { re: /来週/g, resolve: () => null, vague: true },
    { re: /今週中|今週/g, resolve: () => null, vague: true },
    {
      re: /月曜日?/g,
      resolve: () => toISODate(weekdayResolver(1)(ref)),
    },
    {
      re: /火曜日?/g,
      resolve: () => toISODate(weekdayResolver(2)(ref)),
    },
    {
      re: /水曜日?/g,
      resolve: () => toISODate(weekdayResolver(3)(ref)),
    },
    {
      re: /木曜日?/g,
      resolve: () => toISODate(weekdayResolver(4)(ref)),
    },
    {
      re: /金曜日?/g,
      resolve: () => toISODate(weekdayResolver(5)(ref)),
    },
    {
      re: /土曜日?/g,
      resolve: () => toISODate(weekdayResolver(6)(ref)),
    },
    {
      re: /日曜日?/g,
      resolve: () => toISODate(weekdayResolver(0)(ref)),
    },
    {
      re: /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})日?/g,
      resolve: () => {
        const m = rest.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
        if (!m) return null;
        return format(
          new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
          "yyyy-MM-dd",
        );
      },
    },
  ];

  for (const rule of rules) {
    if (rule.re.test(rest)) {
      const resolved = rule.resolve();
      if (resolved) date = resolved;
      if (rule.vague) vague = true;
      rest = rest.replace(rule.re, " ").trim();
    }
    rule.re.lastIndex = 0;
  }

  return { date, vague, rest };
}

function parseTimeAndDuration(rest: string): {
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  rest: string;
  usedPeriod: boolean;
} {
  let working = rest;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let durationMinutes: number | null = null;
  let usedPeriod = false;

  const rangeMatch = working.match(
    /(\d{1,2})[:：](\d{2})\s*[-〜~–—]\s*(\d{1,2})[:：](\d{2})/,
  );
  if (rangeMatch) {
    startTime = padHHMM(Number(rangeMatch[1]), Number(rangeMatch[2]));
    endTime = padHHMM(Number(rangeMatch[3]), Number(rangeMatch[4]));
    working = working.replace(rangeMatch[0], " ").trim();
    durationMinutes = toMinutes(endTime) - toMinutes(startTime);
    return { startTime, endTime, durationMinutes, rest: working, usedPeriod };
  }

  for (const [label, slot] of Object.entries(TIME_PERIOD)) {
    if (working.includes(label)) {
      startTime = slot.start;
      endTime = slot.end;
      durationMinutes = toMinutes(endTime) - toMinutes(startTime);
      usedPeriod = true;
      working = working.replace(label, " ").trim();
      break;
    }
  }

  const fromMatch = working.match(/(\d{1,2})\s*時\s*半\s*から/);
  if (fromMatch) {
    startTime = padHHMM(Number(fromMatch[1]), 30);
    working = working.replace(fromMatch[0], " ").trim();
  } else {
    const halfMatch = working.match(/(\d{1,2})\s*時\s*半/);
    if (halfMatch) {
      startTime = padHHMM(Number(halfMatch[1]), 30);
      working = working.replace(halfMatch[0], " ").trim();
    }
  }

  const clockMatch = working.match(/(\d{1,2})[:：](\d{2})/);
  if (!startTime && clockMatch) {
    startTime = padHHMM(Number(clockMatch[1]), Number(clockMatch[2]));
    working = working.replace(clockMatch[0], " ").trim();
  }

  const hourFromMatch = working.match(/(\d{1,2})\s*時\s*から/);
  if (!startTime && hourFromMatch) {
    startTime = padHHMM(Number(hourFromMatch[1]), 0);
    working = working.replace(hourFromMatch[0], " ").trim();
  }

  const hourAtMatch = working.match(/(\d{1,2})\s*時に/);
  if (!startTime && hourAtMatch) {
    startTime = padHHMM(Number(hourAtMatch[1]), 0);
    working = working.replace(hourAtMatch[0], " ").trim();
  }

  const hourOnly = working.match(/(\d{1,2})\s*時(?!\s*半)/);
  if (!startTime && hourOnly) {
    startTime = padHHMM(Number(hourOnly[1]), 0);
    working = working.replace(hourOnly[0], " ").trim();
  }

  const hourDur = working.match(/(\d+(?:\.\d+)?)\s*時間/);
  if (hourDur) {
    const mins = Math.round(Number(hourDur[1]) * 60);
    durationMinutes = mins;
    working = working.replace(hourDur[0], " ").trim();
  }

  const minDur = working.match(/(\d+)\s*分/);
  if (minDur && !hourDur) {
    durationMinutes = Number(minDur[1]);
    working = working.replace(minDur[0], " ").trim();
  }

  if (startTime && durationMinutes && !endTime) {
    endTime = minutesToHHmm(toMinutes(startTime) + durationMinutes);
  }

  if (startTime && !endTime && !durationMinutes) {
    durationMinutes = 60;
    endTime = minutesToHHmm(toMinutes(startTime) + 60);
  }

  return { startTime, endTime, durationMinutes, rest: working, usedPeriod };
}

function classifyType(
  text: string,
  hasExplicitTime: boolean,
): { boxType: BoxType; confidence: number } {
  const lower = text.toLowerCase();
  let best: BoxType = "priority";
  let bestScore = 0;

  for (const rule of TYPE_RULES) {
    let score = 0;
    for (const phrase of rule.phrases) {
      if (lower.includes(phrase.toLowerCase())) {
        score += rule.weight ?? 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.type;
    }
  }

  if (hasExplicitTime && FIXED_PHRASES.some((p) => lower.includes(p))) {
    return { boxType: "fixed", confidence: 0.9 };
  }

  if (hasExplicitTime && bestScore === 0) {
    return { boxType: "fixed", confidence: 0.55 };
  }

  if (bestScore === 0) {
    return { boxType: "priority", confidence: 0.35 };
  }

  return {
    boxType: best,
    confidence: Math.min(0.95, 0.45 + bestScore * 0.15),
  };
}

function inferPriority(text: string, boxType: BoxType): BoxPriority {
  const lower = text.toLowerCase();
  if (
    /今日中|最優先|締切|明日まで/.test(lower) ||
    boxType === "priority"
  ) {
    return "high";
  }
  if (boxType === "whitespace" || boxType === "recovery") {
    return "low";
  }
  return "normal";
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*+]|\d+\.)\s*/, "")
    .replace(/^\[[ xX]\]\s*/, "")
    .replace(/^[◆◇■□▼▽●○★☆▶▷]\s*/, "")
    .replace(/^(に|を|で|から|まで|の)\s*/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[:：\-–—、,，]+\s*/, "")
    .trim();
}

function parseLine(line: string, ref: Date): ParsedTextBox | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;
  if (HEADING_ONLY.test(trimmed.replace(/\s/g, ""))) return null;

  const { date, vague, rest: afterDate } = parseDateHint(trimmed, ref);
  const {
    startTime,
    endTime,
    durationMinutes,
    rest: afterTime,
    usedPeriod,
  } = parseTimeAndDuration(afterDate);

  let title = cleanTitle(afterTime);
  if (!title) {
    title = cleanTitle(trimmed);
  }
  if (!title || title.length < 2) return null;

  const hasExplicitTime = !!(startTime && endTime);
  const { boxType, confidence: typeConf } = classifyType(
    `${trimmed} ${title}`,
    hasExplicitTime && !usedPeriod,
  );

  const isFixed =
    boxType === "fixed" ||
    (hasExplicitTime &&
      FIXED_PHRASES.some((p) =>
        trimmed.toLowerCase().includes(p.toLowerCase()),
      ));

  let finalType = boxType;
  if (isFixed) finalType = "fixed";

  const priority = inferPriority(trimmed, finalType);

  let confidence = typeConf;
  if (date) confidence += 0.1;
  if (hasExplicitTime) confidence += 0.15;
  if (vague && !date) confidence -= 0.2;
  if (!hasExplicitTime) confidence -= 0.1;
  confidence = Math.max(0.2, Math.min(1, confidence));

  return {
    title,
    date: vague && !startTime ? null : date,
    startTime: hasExplicitTime ? startTime : null,
    endTime: hasExplicitTime ? endTime : null,
    durationMinutes:
      durationMinutes && durationMinutes > 0 ? durationMinutes : null,
    boxType: finalType,
    priority,
    isFixed,
    sourceText: trimmed,
    confidence,
  };
}

function splitIntoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * 自由文・貼り付けテキストからボックス候補を生成（ルールベース）。
 * AI API は未使用。将来差し替え可能なインターフェース。
 */
export function parseMemoText(
  text: string,
  referenceDate: Date = new Date(),
): TextParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { candidates: [], warnings: ["文章が未入力です"] };
  }

  const warnings: string[] = [];
  const candidates: ParsedTextBox[] = [];

  try {
    for (const line of splitIntoLines(trimmed)) {
      const parsed = parseLine(line, referenceDate);
      if (parsed) candidates.push(parsed);
    }
  } catch {
    warnings.push(
      "文章の解析に失敗しました。文章を短く区切るか、1行に1つの予定を書いて再度お試しください",
    );
    return { candidates: [], warnings };
  }

  if (candidates.length === 0) {
    warnings.push(
      "タスクを1件も抽出できませんでした。1行に1つの予定を書いてください。",
    );
  }

  for (const c of candidates) {
    if (!c.date && !c.startTime) {
      warnings.push(`「${c.title}」の日付・時間を判定できませんでした。`);
    } else if (!c.startTime) {
      warnings.push(`「${c.title}」の時間を判定できませんでした。`);
    }
  }

  return { candidates, warnings };
}

/** ファイル内容をテキストとして解析（.md / .txt） */
export function parseMemoFileContent(
  content: string,
  fileName: string,
  referenceDate: Date = new Date(),
): TextParseResult {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "markdown") {
    const result = parseMemoText(content, referenceDate);
    if (result.candidates.length > 0) return result;
  }
  return parseMemoText(content, referenceDate);
}
