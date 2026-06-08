import { redirect } from "next/navigation";

/** 旧URL互換: /week → トップ（週間スケジュール） */
export default function WeekRedirectPage() {
  redirect("/");
}
