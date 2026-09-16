"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/** Browser client acting as the signed-in user (RLS applies). */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
