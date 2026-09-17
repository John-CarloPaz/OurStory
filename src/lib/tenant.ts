import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Tables } from "@/lib/database.types";
import { ACTIVE_COUPLE_COOKIE } from "@/lib/redirects";
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-scoped identity and tenant resolution.
 *
 * Authorization model:
 *   - Who you are comes from the verified Supabase JWT (getClaims()).
 *   - Which couples you belong to comes from couple_members, read through RLS.
 *   - The "active couple" cookie is only a PREFERENCE among those memberships.
 *     It is never trusted on its own; a value that is not one of your
 *     memberships is ignored.
 *   - Every data query still runs as you, so RLS is the final word.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserMetadata = {
  display_name?: string;
  needs_password?: boolean;
};

export type Session = {
  supabase: SupabaseServerClient;
  userId: string;
  email: string;
  metadata: UserMetadata;
};

export type SpaceMember = {
  userId: string;
  role: "creator" | "partner";
  displayName: string;
  birthday: string | null;
  avatarPath: string | null;
  joinedAt: string;
  isMe: boolean;
};

export type PendingInvitation = Pick<
  Tables<"couple_invitations">,
  "id" | "invited_email" | "expires_at" | "created_at" | "last_sent_at" | "sends_in_window"
>;

export type ActiveSpace = Session & {
  coupleId: string;
  couple: Tables<"couples">;
  theme: Tables<"couple_themes">;
  members: SpaceMember[];
  me: SpaceMember;
  partner: SpaceMember | null;
  pendingInvitation: PendingInvitation | null;
  memberships: { coupleId: string; label: string }[];
};

export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    supabase,
    userId: claims.sub,
    email: String(claims.email ?? "").toLowerCase(),
    metadata: (claims.user_metadata ?? {}) as UserMetadata,
  };
});

export async function requireSession(next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return session;
}

/** A session whose account is fully set up (invited users must choose a password first). */
export async function requireAccount(next?: string): Promise<Session> {
  const session = await requireSession(next);
  if (session.metadata.needs_password) {
    redirect(next ? `/account/setup?next=${encodeURIComponent(next)}` : "/account/setup");
  }
  return session;
}

export const getMemberships = cache(async () => {
  const session = await getSession();
  if (!session) return [];

  const { data, error } = await session.supabase
    .from("couple_members")
    .select("couple_id, joined_at, couples!inner(id, name, display_title)")
    .eq("user_id", session.userId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data;
});

/** A couple with its theme, members and open invitation, in a single request. */
async function loadCouple(supabase: SupabaseServerClient, coupleId: string) {
  return supabase
    .from("couples")
    .select(
      "*, couple_themes(*), couple_members(user_id, role, avatar_path, joined_at), couple_invitations(id, invited_email, expires_at, created_at, last_sent_at, sends_in_window)",
    )
    .eq("id", coupleId)
    .is("couple_invitations.accepted_at", null)
    .is("couple_invitations.cancelled_at", null)
    .order("joined_at", { referencedTable: "couple_members", ascending: true })
    .single();
}

export const getActiveSpace = cache(async (): Promise<ActiveSpace | null> => {
  const session = await requireAccount();
  const { supabase } = session;
  const preferred = (await cookies()).get(ACTIVE_COUPLE_COOKIE)?.value;

  // Every page waits on this, so start loading the space the cookie points at
  // while the membership list is still on its way. The result is only used
  // once that list confirms the membership (RLS would return nothing anyway).
  const early = preferred && UUID_PATTERN.test(preferred) ? loadCouple(supabase, preferred) : null;

  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const active = memberships.find((m) => m.couple_id === preferred) ?? memberships[0];
  const coupleId = active.couple_id;
  const { data: loaded, error } = await (early && coupleId === preferred ? early : loadCouple(supabase, coupleId));
  if (error) throw error;

  const { couple_themes: theme, couple_members: memberRows, couple_invitations: invitations, ...couple } = loaded;
  if (!theme) throw new Error("This space has no theme row.");

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, birthday")
    .in(
      "id",
      memberRows.map((m) => m.user_id),
    );
  if (profilesError) throw profilesError;

  const members: SpaceMember[] = memberRows.map((m) => {
    const profile = profiles.find((p) => p.id === m.user_id);
    return {
      userId: m.user_id,
      role: m.role as SpaceMember["role"],
      displayName: profile?.display_name ?? "Partner",
      birthday: profile?.birthday ?? null,
      avatarPath: m.avatar_path,
      joinedAt: m.joined_at,
      isMe: m.user_id === session.userId,
    };
  });

  const me = members.find((m) => m.isMe);
  if (!me) return null;

  return {
    ...session,
    coupleId,
    couple,
    theme,
    members,
    me,
    partner: members.find((m) => !m.isMe) ?? null,
    pendingInvitation: invitations[0] ?? null,
    memberships: memberships.map((m) => ({
      coupleId: m.couple_id,
      label: m.couples.name ?? m.couples.display_title,
    })),
  };
});

export async function requireActiveSpace(): Promise<ActiveSpace> {
  const space = await getActiveSpace();
  if (!space) redirect("/onboarding");
  return space;
}

/** "John ♡ Kath", or just "John" while the partner has not joined yet. */
export function partnerNames(space: Pick<ActiveSpace, "members">, separator = "♡"): string {
  return space.members.map((m) => m.displayName).join(` ${separator} `);
}
