import "server-only";
import { cookies } from "next/headers";
import { isValidTimeZone, TIME_ZONE_COOKIE } from "@/lib/dates";

export async function getViewerTimeZone(): Promise<string> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return isValidTimeZone(value) ? value : "UTC";
}
