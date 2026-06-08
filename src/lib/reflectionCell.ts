/** 旧 UI のラベル／プレースホルダーがそのまま保存されていた値 */
export const REFLECTION_LEGACY_LABEL = "振り返りメモ";

/** Real 列・時間マスごとの振り返りメモキー */
export function reflectionCellKey(
  date: string,
  blockStart: string,
  blockEnd: string,
): string {
  return `${date}|${blockStart}|${blockEnd}`;
}

/** 表示・保存用: 旧ラベル文字列は空扱い */
export function normalizeReflectionText(value: string): string {
  const t = value.trim();
  if (t === REFLECTION_LEGACY_LABEL) return "";
  return value;
}

export function cleanRealReflectionRecord(
  record: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(record)) {
    const text = normalizeReflectionText(raw);
    if (text.trim()) out[key] = text;
  }
  return out;
}
