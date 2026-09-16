import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/**
 * Per-request Supabase client acting AS THE SIGNED-IN USER.
 *
 * Every query made through this client is subject to Row Level Security, which
 * is the actual tenant boundary. This is the client all data access uses.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
