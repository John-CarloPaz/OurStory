import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * Allowed uses (keep this list short and reviewed):
 *   1. Sending invitation emails through Supabase Auth (auth.admin.inviteUserByEmail).
 *   2. public.get_auth_account_state() — deciding which Supabase Auth email to send.
 *
 * Never use it to read or write couple content. Tenant data is always accessed
 * through createSupabaseServerClient() so RLS enforces isolation.
 */
export function createSupabaseAdminClient() {
  if (!serverEnv.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Anonymous, stateless client for triggering Supabase Auth emails on behalf of
 * someone who is not the current browser's user (e.g. a sign-in link for an
 * invitee). Uses the implicit flow so the link works on any device.
 */
export function createSupabaseStatelessClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" },
  });
}
