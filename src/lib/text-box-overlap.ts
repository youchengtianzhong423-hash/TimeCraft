import { isOverlap } from "@/lib/timeBlocks";
import type { Box } from "@/lib/types";
import type { EditableTextBoxCandidate } from "@/lib/text-box-types";

export interface CandidateOverlap {
  candidateId: string;
  candidateTitle: string;
  existing: Box;
}

/** スケジュール追加候補と既存ボックスの重なりを検出 */
export function findCandidateOverlaps(
  candidates: EditableTextBoxCandidate[],
  existingBoxes: Box[],
): CandidateOverlap[] {
  const overlaps: CandidateOverlap[] = [];

  for (const c of candidates) {
    if (!c.selected || c.timeUnset || !c.date || !c.startTime || !c.endTime) {
      continue;
    }
    for (const b of existingBoxes) {
      if (b.status === "deleted" || b.isPooled) continue;
      if (b.date !== c.date) continue;
      if (isOverlap(c.startTime, c.endTime, b.startTime, b.endTime)) {
        overlaps.push({
          candidateId: c.id,
          candidateTitle: c.title,
          existing: b,
        });
      }
    }
  }

  return overlaps;
}
