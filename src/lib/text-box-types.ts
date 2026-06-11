import type { BoxType } from "./types";

export type BoxPriority = "high" | "normal" | "low";

/** 文章解析の出力（UI 用 id はクライアント側で付与） */
export interface ParsedTextBox {
  title: string;
  /** yyyy-MM-dd。判定できない場合は null */
  date: string | null;
  /** HH:mm。未設定は null */
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  boxType: BoxType;
  priority: BoxPriority;
  isFixed: boolean;
  sourceText: string;
  /** 0〜1 の推定信頼度 */
  confidence: number;
}

export interface TextParseResult {
  candidates: ParsedTextBox[];
  warnings: string[];
}

/** 確認画面で編集可能な候補 */
export interface EditableTextBoxCandidate
  extends Omit<ParsedTextBox, "date" | "startTime" | "endTime"> {
  id: string;
  selected: boolean;
  /** 表示・編集用（未設定時はフォールバック日付） */
  date: string;
  startTime: string;
  endTime: string;
  /** 日付が未設定のとき true */
  dateUnset: boolean;
  /** 時刻が未設定のとき true */
  timeUnset: boolean;
}

export type OverlapResolution =
  | "addAnyway"
  | "editTime"
  | "saveToPool"
  | "cancel";
