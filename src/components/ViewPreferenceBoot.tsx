"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readScheduleViewPreference } from "@/lib/viewPreference";

/** 初回クライアントマウント時のみ、保存済みビューへ復元（SSR/hydration 安全） */
export function ViewPreferenceBoot() {
  const pathname = usePathname();
  const router = useRouter();
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const pref = readScheduleViewPreference();
    if (pathname === "/" && pref === "today") {
      router.replace("/today");
    }
  }, [pathname, router]);

  return null;
}
