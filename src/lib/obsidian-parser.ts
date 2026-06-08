import type { BoxType } from "./types";

export interface ParsedBoxCandidate {
  /** 原文の行 */
  rawLine: string;
  title: string;
  type: BoxType;
  /** "HH:mm"。未指定なら null */
  startTime: string | null;
  endTime: string | null;
  /** 抽出元のセクション見出し */
  section?: string;
  /** ユーザー追加メモ（行に残った補足） */
  memo?: string;
}

/** ボックスタイプ判定用のキーワード辞書（日本語 + 英語 + よくある略） */
const TYPE_KEYWORDS: Record<BoxType, string[]> = {
  fixed: ["固定", "fixed", "予定", "ミーティング", "打合せ", "打ち合わせ", "通院"],
  priority: ["優先", "priority", "重要", "最優先", "top", "メイン"],
  asset: ["資産", "asset", "投資", "学習", "発信", "コンテンツ"],
  recovery: [
    "回復",
    "recovery",
    "休憩",
    "睡眠",
    "食事",
    "運動",
    "散歩",
    "入浴",
    "rest",
  ],
  shallowWork: [
    "雑務",
    "shallow",
    "shallowwork",
    "メール",
    "事務",
    "返信",
    "shallow-work",
  ],
  whitespace: ["余白", "whitespace", "空き", "free", "自由", "ぼーっと"],
  date: ["デート", "date", "家族", "友人", "パートナー"],
  reflection: [
    "内省",
    "reflection",
    "日記",
    "振り返り",
    "レビュー",
    "review",
  ],
  offline: [
    "デトックス",
    "オフライン",
    "offline",
    "detox",
    "スマホ禁止",
    "sns禁止",
  ],
};

const ALL_TYPE_KEYWORDS = Object.entries(TYPE_KEYWORDS).flatMap(
  ([type, words]) => words.map((w) => ({ type: type as BoxType, word: w })),
);

const TIME_RANGE_REGEX =
  /(?<sh>\d{1,2})[:：](?<sm>\d{2})\s*[-〜~–—]\s*(?<eh>\d{1,2})[:：](?<em>\d{2})/;

const BRACKET_TYPE_REGEX = /[\[\【［]([^\]\】］]+)[\]\】］]/;
const HASH_TAG_REGEX = /#([\p{L}\p{N}_-]+)/gu;

const padHHMM = (h: number, m: number): string => {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
};

/** 1行から候補ボックスを抽出する。該当しなければ null。 */
function parseLine(
  line: string,
  defaultType: BoxType,
  section?: string,
): ParsedBoxCandidate | null {
  // バレットマーカー / チェックボックス / 数字リストを除去
  let working = line
    .replace(/^\s*(?:[-*+]|\d+\.)\s*/, "")
    .replace(/^\[[ xX]\]\s*/, "")
    .trim();

  if (!working) return null;

  // 見出しやコードブロックは弾く
  if (working.startsWith("#")) return null;
  if (working.startsWith("```")) return null;

  // 1) 時間レンジを抽出
  let startTime: string | null = null;
  let endTime: string | null = null;
  const timeMatch = working.match(TIME_RANGE_REGEX);
  if (timeMatch?.groups) {
    const sh = Number(timeMatch.groups.sh);
    const sm = Number(timeMatch.groups.sm);
    const eh = Number(timeMatch.groups.eh);
    const em = Number(timeMatch.groups.em);
    if (
      sh >= 0 &&
      sh <= 24 &&
      sm >= 0 &&
      sm < 60 &&
      eh >= 0 &&
      eh <= 24 &&
      em >= 0 &&
      em < 60
    ) {
      startTime = padHHMM(sh, sm);
      endTime = padHHMM(eh, em);
      working = working.replace(timeMatch[0], "").trim();
    }
  }

  // 2) タイプを判定する
  let type: BoxType | null = null;

  // 2-a) [優先] [priority] などの括弧記法
  const bracketMatch = working.match(BRACKET_TYPE_REGEX);
  if (bracketMatch) {
    const inside = bracketMatch[1].trim().toLowerCase();
    const hit = ALL_TYPE_KEYWORDS.find((k) =>
      inside === k.word.toLowerCase()
        ? true
        : inside.includes(k.word.toLowerCase()),
    );
    if (hit) {
      type = hit.type;
      working = working.replace(bracketMatch[0], "").trim();
    }
  }

  // 2-b) #priority などのハッシュタグ
  if (!type) {
    const tags = Array.from(working.matchAll(HASH_TAG_REGEX)).map(
      (m) => m[1].toLowerCase(),
    );
    for (const tag of tags) {
      const hit = ALL_TYPE_KEYWORDS.find(
        (k) => k.word.toLowerCase() === tag,
      );
      if (hit) {
        type = hit.type;
        // 該当タグは削除
        working = working.replace(new RegExp(`#${tag}\\b`, "iu"), "").trim();
        break;
      }
    }
  }

  // 2-c) タイトル本文に含まれるキーワード
  if (!type) {
    const lower = working.toLowerCase();
    const hit = ALL_TYPE_KEYWORDS.find((k) =>
      lower.includes(k.word.toLowerCase()),
    );
    if (hit) type = hit.type;
  }

  // 残った余分な記号 / 空白の整理
  working = working.replace(/\s+/g, " ").replace(/^[:：\-–—]+\s*/, "").trim();
  if (!working) return null;

  return {
    rawLine: line,
    title: working,
    type: type ?? defaultType,
    startTime,
    endTime,
    section,
  };
}

const TIMECRAFT_SECTION_HEADINGS = [
  "timecraft",
  "今日の予定",
  "スケジュール",
  "今日のスケジュール",
  "本日のスケジュール",
  "今日のタイムテーブル",
  "予定",
];

const TASK_SECTION_HEADINGS = [
  "今日の作業",
  "今日の作業内容",
  "今日のタスク",
  "本日のタスク",
  "今日やること",
  "to do",
  "todo",
  "tasks",
  "明日の目標",
  "明日のタスク",
  "明日やること",
];

const isSectionMatch = (heading: string, list: string[]): boolean => {
  const norm = heading.toLowerCase().trim();
  return list.some((h) => norm.includes(h));
};

export interface ParseOptions {
  /** タイプ未検出時のデフォルト */
  defaultType?: BoxType;
}

export interface ParseResult {
  scheduled: ParsedBoxCandidate[];
  tasks: ParsedBoxCandidate[];
  /** 自由形式抽出のみで時間が未指定なもの */
  warnings: string[];
}

/** Markdown ファイル全体を解析して候補ボックスを返す。
 *  - `## TimeCraft / ## 今日の予定` 等のセクションは「スケジュール候補」として
 *  - `## 今日のタスク / ## 今日の作業内容` 等のセクションは「タスク候補（時間未指定）」として
 */
export function parseObsidianMarkdown(
  markdown: string,
  options: ParseOptions = {},
): ParseResult {
  const defaultType: BoxType = options.defaultType ?? "priority";
  const lines = markdown.split(/\r?\n/);

  let currentSection: string | undefined;
  let mode: "none" | "scheduled" | "tasks" = "none";
  let inCodeBlock = false;
  let inFrontmatter = false;

  const scheduled: ParsedBoxCandidate[] = [];
  const tasks: ParsedBoxCandidate[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // YAML frontmatter スキップ
    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line.trim() === "---") inFrontmatter = false;
      continue;
    }

    // コードブロックスキップ
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 見出しでモード切替（Markdown見出し and 記号見出し ◆◇■▼● 等）
    const mdHeading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    const symbolHeading = line.match(
      /^[◆◇■□▼▽●○★☆▶▷]\s*([^\s].{0,40})\s*$/,
    );
    const headingMatch = mdHeading ?? symbolHeading;
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      currentSection = heading;
      if (isSectionMatch(heading, TIMECRAFT_SECTION_HEADINGS)) {
        mode = "scheduled";
      } else if (isSectionMatch(heading, TASK_SECTION_HEADINGS)) {
        mode = "tasks";
      } else {
        mode = "none";
      }
      continue;
    }

    // 関心のないセクションでも、HH:MM-HH:MM がある行は拾う（柔軟対応）
    if (mode === "none") {
      if (TIME_RANGE_REGEX.test(line)) {
        const candidate = parseLine(line, defaultType, currentSection);
        if (candidate && candidate.startTime && candidate.endTime) {
          scheduled.push(candidate);
        }
      }
      continue;
    }

    const candidate = parseLine(line, defaultType, currentSection);
    if (!candidate) continue;

    if (mode === "scheduled") {
      if (candidate.startTime && candidate.endTime) {
        scheduled.push(candidate);
      } else {
        tasks.push(candidate);
        warnings.push(
          `「${candidate.title}」は時間が指定されていません。インポート時に時刻を割り当ててください。`,
        );
      }
    } else if (mode === "tasks") {
      tasks.push(candidate);
    }
  }

  return { scheduled, tasks, warnings };
}
