export type Theme = "white" | "navy" | "black";

export type BoxType =
  | "fixed"
  | "priority"
  | "asset"
  | "recovery"
  | "shallowWork"
  | "whitespace"
  | "date"
  | "reflection"
  | "offline";

export type BoxStatus =
  | "notStarted"
  | "inProgress"
  | "completed"
  | "paused"
  | "postponed"
  | "deleted";

export type RepeatRule =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "thisWeek";

/** 週間手帳ビュー用メモ（Vision/Real 横並び画面の左サイド） */
export interface WeekPlannerNotes {
  /** 週の月曜日 ISO date */
  weekStart: string;
  weeklyPriority: string;
  microSuccess: string;
  weeklyEvaluation: string;
  /** yyyy-MM-dd → その日の Daily Priority テキスト */
  dailyPriority: Record<string, string>;
  /** `date|blockStart|blockEnd` → Real 列の振り返りメモ（表示ラベルなし） */
  realReflection: Record<string, string>;
}

export interface Box {
  id: string;
  title: string;
  type: BoxType;
  /** ISO date string yyyy-MM-dd */
  date: string;
  /** HH:mm (00:00-24:00) */
  startTime: string;
  endTime: string;
  /** minutes */
  plannedDuration: number;
  /** minutes (実績) */
  actualDuration?: number;
  purpose?: string;
  memo?: string;
  status: BoxStatus;
  repeatRule: RepeatRule;
  /** notification ON/OFF (MVPでは保存のみ) */
  notify?: boolean;
  /** 完了時の振り返り */
  completion?: {
    asPlanned: boolean | null;
    focused: number | null; // 1-5
    nextImprovement?: string;
    note?: string;
  };
  /** 実行用タイムスタンプ */
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  /** Google カレンダー連携 */
  googleEventId?: string;
  googleCalendarId?: string;
  /** 終日イベント */
  isAllDay?: boolean;
  /** ユーザーが手動で編集した場合 true（次回同期で上書きを避ける） */
  manuallyEdited?: boolean;
  /** やることリスト（未配置プール）に入っている。true の場合 date/startTime/endTime は仮値。 */
  isPooled?: boolean;
  /**
   * やることリストのマスター box.id への参照。
   * スケジュール / Top3 にドラッグした連動コピーだけが持つ（マスターは持たない）。
   */
  poolSourceId?: string;
  /** プール内での並び順（小さい順） */
  poolOrder?: number;
  /** やることリストが所属する週の月曜 ISO 日付（週スコープ管理用） */
  poolWeekStart?: string;
  /** 由来テンプレート ID（あれば） */
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ボックスのテンプレート（よく使うタスクの雛形）
 *
 * 用途：
 * - ボックス作成ダイアログでワンクリック適用
 * - やることリストへのワンクリック追加
 */
export interface BoxTemplate {
  id: string;
  title: string;
  type: BoxType;
  /** 既定の所要時間（分） */
  defaultDurationMinutes: number;
  purpose?: string;
  memo?: string;
  /** 使用回数（よく使う順表示用） */
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}

export interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number | null; // unix ms
  email?: string;
}

export interface GoogleSyncSettings {
  /** 同期対象のカレンダー ID リスト */
  selectedCalendarIds: string[];
  /** 既知のカレンダー一覧キャッシュ */
  availableCalendars: GoogleCalendarInfo[];
  /** 直近の同期日時 */
  lastSyncedAt: string | null;
  /** 直近の同期結果 */
  lastSyncSummary?: {
    created: number;
    updated: number;
    skipped: number;
    error?: string;
  };
  /** 同期する日付範囲（週数: 過去 / 未来） */
  pastWeeks: number;
  futureWeeks: number;
}

export interface DailyReview {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  completedTasks: string;
  unfinishedTasks: string;
  goodPoints: string;
  improvementPoints: string;
  /** 1-5 */
  satisfactionScore: number;
  /** minutes */
  assetTime: number;
  whitespaceTime: number;
  recoveryTime: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  /** yyyy-MM-dd (週の開始日 = 月曜) */
  weekStartDate: string;
  weekEndDate: string;
  assetTime: number;
  whitespaceTime: number;
  shallowWorkTime: number;
  recoveryTime: number;
  bestBox?: string;
  improvementBox?: string;
  reduceNextWeek?: string;
  increaseNextWeek?: string;
  nextWeekPriority?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}
