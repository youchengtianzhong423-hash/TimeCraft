import type { GoogleCalendarInfo } from "./types";

const API_BASE = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_OAUTH_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

interface FetchOpts {
  accessToken: string;
  /** リクエスト URL に対する query string */
  query?: Record<string, string>;
}

async function gcFetch<T>(
  path: string,
  { accessToken, query }: FetchOpts,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      "Google の認証が切れたか、権限が不足しています。再接続してください。",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API エラー (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export interface GoogleEventTime {
  dateTime?: string; // ISO with offset
  date?: string; // yyyy-MM-dd (all-day)
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  htmlLink?: string;
}

interface ListCalendarsResponse {
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
    accessRole?: string;
  }>;
}

interface ListEventsResponse {
  items: GoogleEvent[];
  nextPageToken?: string;
}

/** ユーザーの全カレンダーを取得 */
export async function listCalendars(
  accessToken: string,
): Promise<GoogleCalendarInfo[]> {
  const data = await gcFetch<ListCalendarsResponse>(
    "/users/me/calendarList",
    { accessToken, query: { maxResults: "250" } },
  );
  return data.items.map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary,
    backgroundColor: c.backgroundColor,
    accessRole: c.accessRole,
  }));
}

/** 指定カレンダー・期間のイベントを取得（ページング対応） */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEvent[]> {
  const items: GoogleEvent[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const data: ListEventsResponse = await gcFetch<ListEventsResponse>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        accessToken,
        query: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "250",
          ...(pageToken ? { pageToken } : {}),
        },
      },
    );
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

/** アクセストークンが有効か簡易チェック */
export const isTokenValid = (expiresAt: number | null | undefined): boolean => {
  if (!expiresAt) return false;
  // 余裕を持って 60 秒前に失効とみなす
  return Date.now() < expiresAt - 60_000;
};
