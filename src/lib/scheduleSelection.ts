/** テキスト入力中か（ショートカット無効判定） */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function isModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("timecraft-modal-open");
}

/** 横方向複製の対象日付（元の日を除く） */
export function datesForHorizontalDuplicate(
  weekDates: string[],
  sourceDate: string,
  hoverDate: string,
): string[] {
  const sourceIdx = weekDates.indexOf(sourceDate);
  const hoverIdx = weekDates.indexOf(hoverDate);
  if (sourceIdx === -1 || hoverIdx === -1 || sourceIdx === hoverIdx) {
    return [];
  }
  if (hoverIdx > sourceIdx) {
    return weekDates.slice(sourceIdx + 1, hoverIdx + 1);
  }
  return weekDates.slice(hoverIdx, sourceIdx);
}
