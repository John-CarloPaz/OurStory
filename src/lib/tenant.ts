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

export const getActiveSpace = cache(async (): Promise<ActiveSpace | null> => {
  const session = await requireAccount();
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_COUPLE_COOKIE)?.value;
  const active = memberships.find((m) => m.couple_id === preferred) ?? memberships[0];
  const coupleId = active.couple_id;
  const { supabase } = session;

  const [coupleRes, themeRes, membersRes, invitationRes] = await Promise.all([
    supabase.from("couples").select("*").eq("id", coupleId).single(),
    supabase.from("couple_themes").select("*").eq("couple_id", coupleId).single(),
    supabase
      .from("couple_members")
      .select("user_id, role, avatar_path, joined_at")
      .eq("couple_id", coupleId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("couple_invitations")
      .select("id, invited_email, expires_at, created_at, last_sent_at, sends_in_window")
      .eq("couple_id", coupleId)
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .maybeSingle(),
  ]);

  if (coupleRes.error || themeRes.error || membersRes.error || invitationRes.error) {
    throw coupleRes.error ?? themeRes.error ?? membersRes.error ?? invitationRes.error;
  }

  const memberIds = membersRes.data.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, birthday")
    .in("id", memberIds);
  if (profilesError) throw profilesError;

  const members: SpaceMember[] = membersRes.data.map((m) => {
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
    couple: coupleRes.data,
    theme: themeRes.data,
    members,
    me,
    partner: members.find((m) => !m.isMe) ?? null,
    pendingInvitation: invitationRes.data,
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
