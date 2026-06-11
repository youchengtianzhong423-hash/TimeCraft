import type { Box } from "@/lib/types";
import { newId } from "@/lib/id";

/** マスターまたは既存配置から、週間グリッド用の独立した配置コピーを生成 */
export function createGridPlacement(
  source: Box,
  params: {
    date: string;
    startTime: string;
    endTime: string;
    plannedDuration: number;
    poolSourceId?: string;
    recurrenceGroupId?: string;
    now: string;
  },
): Box {
  const {
    date,
    startTime,
    endTime,
    plannedDuration,
    poolSourceId,
    recurrenceGroupId,
    now,
  } = params;

  return {
    ...source,
    id: newId(),
    poolSourceId,
    recurrenceGroupId,
    date,
    startTime,
    endTime,
    plannedDuration,
    isPooled: false,
    poolOrder: undefined,
    repeatRule: "none",
    status: "notStarted",
    completion: undefined,
    startedAt: undefined,
    pausedAt: undefined,
    completedAt: undefined,
    googleEventId: undefined,
    googleCalendarId: undefined,
    manuallyEdited: false,
    createdAt: now,
    updatedAt: now,
  };
}
