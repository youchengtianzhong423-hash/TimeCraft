import { diagnoseDay } from "@/lib/diagnose";
import { durationMinutes } from "@/lib/timeBlocks";
import type { Box } from "@/lib/types";
import type { EditableTextBoxCandidate } from "@/lib/text-box-types";

/** 候補をすべて追加した場合の簡易詰め込み警告 */
export function diagnoseCandidateAddition(
  existingBoxes: Box[],
  toAdd: EditableTextBoxCandidate[],
): string[] {
  const messages: string[] = [];
  const scheduled = toAdd.filter(
    (c) =>
      c.selected &&
      !c.timeUnset &&
      c.date &&
      c.startTime &&
      c.endTime,
  );

  const dates = [...new Set(scheduled.map((c) => c.date as string))];

  for (const date of dates) {
    const dayExisting = existingBoxes.filter(
      (b) => b.date === date && b.status !== "deleted" && !b.isPooled,
    );
    const dayNew: Box[] = scheduled
      .filter((c) => c.date === date)
      .map((c, i) => ({
        id: `preview-${i}`,
        title: c.title,
        type: c.boxType,
        date: c.date!,
        startTime: c.startTime!,
        endTime: c.endTime!,
        plannedDuration: durationMinutes(c.startTime!, c.endTime!),
        status: "notStarted" as const,
        repeatRule: "none" as const,
        createdAt: "",
        updatedAt: "",
      }));

    const combined = [...dayExisting, ...dayNew];
    const d = diagnoseDay(combined);

    if (d.level === "danger" || d.level === "warning") {
      messages.push(`${date}: ${d.message}`);
    }

    const priorityCount = combined.filter((b) => b.type === "priority").length;
    if (priorityCount >= 4) {
      messages.push(
        `${date}: 優先タスクが${priorityCount}件あります。2〜3件に絞ることをおすすめします。`,
      );
    }

    const whitespaceMin = combined
      .filter((b) => b.type === "whitespace")
      .reduce((acc, b) => acc + durationMinutes(b.startTime, b.endTime), 0);

    if (whitespaceMin < 120 && scheduled.some((c) => c.date === date)) {
      messages.push(
        `${date}: この予定をすべて入れると、余白が${Math.round(whitespaceMin / 60)}時間程度になります（推奨は2時間以上）。`,
      );
    }
  }

  return [...new Set(messages)];
}
