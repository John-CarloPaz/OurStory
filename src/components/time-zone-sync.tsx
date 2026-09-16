"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/dates";

/** Stores the viewer's IANA time zone so the server can render and parse times in it. */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.split("=")[1];
    if (current && decodeURIComponent(current) === zone) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
