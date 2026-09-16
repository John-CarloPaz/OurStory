import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { generateInvitationToken } from "@/lib/invitations/token";

/**
 * End-to-end checks against the REAL Supabase project in .env.local:
 * PostgREST embeds and column grants, RLS, RPCs, Storage policies with signed
 * uploads, and (when the dev server is running) the rendered pages.
 *
 * Creates throwaway, pre-confirmed users (no emails are sent) and deletes
 * everything it created in afterAll.
 *
 *   npm run test:live            (dev server optional: LIVE_APP_URL, default http://localhost:3000)
 */

const env = parseEnv(readFileSync(join(__dirname, "..", "..", ".env.local"), "utf8"));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = env.SUPABASE_SECRET_KEY!;
const APP_URL = process.env.LIVE_APP_URL ?? "http://localhost:3000";
const BUCKET = "couple-media";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

type Db = SupabaseClient<Database>;
type LiveUser = { id: string; email: string; password: string; name: string; client: Db; accessToken: string; refreshToken: string };

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin: Db = createClient<Database>(URL_, SECRET, clientOptions);
const anon: Db = createClient<Database>(URL_, PUBLISHABLE, clientOptions);
const run = randomUUID().slice(0, 8);

const createdUserIds: string[] = [];
const createdCoupleIds: string[] = [];

async function createLiveUser(name: string): Promise<LiveUser> {
  const email = `our-story-e2e+${name.toLowerCase()}-${run}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);

  const client = createClient<Database>(URL_, PUBLISHABLE, clientOptions);
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return {
    id: data.user.id,
    email,
    password,
    name,
    client,
    accessToken: signIn.data.session.access_token,
    refreshToken: signIn.data.session.refresh_token,
  };
}

function uploadPath(coupleId: string, area: "cover" | "avatars" | "journals", owner?: string, ext = "png") {
  return owner ? `couples/${coupleId}/${area}/${owner}/${randomUUID()}.${ext}` : `couples/${coupleId}/${area}/${randomUUID()}.${ext}`;
}

/** Session cookies exactly as @supabase/ssr writes them, for requesting app pages as a user. */
async function sessionCookieHeader(user: LiveUser): Promise<string> {
  const jar = new Map<string, string>();
  const server = createServerClient(URL_, PUBLISHABLE, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await server.auth.setSession({ access_token: user.accessToken, refresh_token: user.refreshToken });
  if (error) throw error;
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function appReachable(): Promise<boolean> {
  try {
    const res = await fetch(APP_URL, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

let john: LiveUser;
let kath: LiveUser;
let outsider: LiveUser;
let coupleId: string;
let invite: ReturnType<typeof generateInvitationToken>;
let journalId: string;
let photoPath: string;
let sealedLetterId: string;
let openLetterId: string;
let outsiderCoupleId: string;
let outsiderInvite: ReturnType<typeof generateInvitationToken>;
let outsiderInvitationId: string;

beforeAll(async () => {
  john = await createLiveUser("John");
  kath = await createLiveUser("Kath");
  outsider = await createLiveUser("Outsider");
}, 120_000);

afterAll(async () => {
  for (const id of createdCoupleIds) {
    for (const area of ["cover", "avatars", "journals"]) {
      const { data: folders } = await admin.storage.from(BUCKET).list(`couples/${id}/${area}`, { limit: 1000 });
      for (const entry of folders ?? []) {
        if (entry.id) {
          await admin.storage.from(BUCKET).remove([`couples/${id}/${area}/${entry.name}`]);
        } else {
          const dir = `couples/${id}/${area}/${entry.name}`;
          const { data: files } = await admin.storage.from(BUCKET).list(dir, { limit: 1000 });
          if (files?.length) await admin.storage.from(BUCKET).remove(files.map((f) => `${dir}/${f.name}`));
        }
      }
    }
  }
  if (createdCoupleIds.length) await admin.from("couples").delete().in("id", createdCoupleIds);
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);

  const { count } = await admin.from("couples").select("id", { count: "exact", head: true }).in("id", createdCoupleIds.length ? createdCoupleIds : [randomUUID()]);
  console.info(`[live] cleanup: removed ${createdUserIds.length} users and ${createdCoupleIds.length} couples; couples left: ${count}`);
}, 180_000);

describe("live Supabase: John and Kath", () => {
  it("John creates the space and invitation", async () => {
    invite = generateInvitationToken();
    const { data, error } = await john.client.rpc("create_couple", {
      p_creator_name: "John",
      p_partner_email: kath.email,
      p_invite_token_hash: invite.tokenHash,
      p_couple_name: "John & Kath",
      p_story_began_on: "2026-09-14",
      p_invite_ttl_days: 7,
    });
    expect(error).toBeNull();
    coupleId = (data as { couple_id: string }).couple_id;
    createdCoupleIds.push(coupleId);
  });

  it("anyone holding the link sees who invited them", async () => {
    const { data, error } = await anon.rpc("get_invitation_preview", { p_token: invite.token });
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "valid", inviter_name: "John", couple_label: "John & Kath", invited_email: kath.email });
  });

  it("the invitation cannot be accepted by a different account", async () => {
    const { error } = await outsider.client.rpc("accept_couple_invitation", { p_token: invite.token });
    expect(error?.message).toBe("invitation_email_mismatch");
  });

  it("Kath accepts and joins", async () => {
    const { data, error } = await kath.client.rpc("accept_couple_invitation", { p_token: invite.token, p_display_name: "Kath" });
    expect(error).toBeNull();
    expect((data as { couple_id: string }).couple_id).toBe(coupleId);
  });

  it("Kath's workspace query (the one the app runs) returns the shared space", async () => {
    const memberships = await kath.client
      .from("couple_members")
      .select("couple_id, joined_at, couples!inner(id, name, display_title)")
      .eq("user_id", kath.id);
    expect(memberships.error).toBeNull();
    expect(memberships.data).toHaveLength(1);
    expect(memberships.data![0].couples).toMatchObject({ name: "John & Kath", display_title: "Our Little World" });

    const members = await kath.client.from("couple_members").select("user_id").eq("couple_id", coupleId);
    const profiles = await kath.client.from("profiles").select("id, display_name").in("id", members.data!.map((m) => m.user_id));
    expect(profiles.data!.map((p) => p.display_name).sort()).toEqual(["John", "Kath"]);

    const invitation = await john.client
      .from("couple_invitations")
      .select("id, invited_email, accepted_at")
      .eq("couple_id", coupleId)
      .single();
    expect(invitation.data?.accepted_at).not.toBeNull();

    const tokenHash = await john.client.from("couple_invitations").select("token_hash").eq("couple_id", coupleId);
    expect(tokenHash.error?.code).toBe("42501");
  });

  it("both partners create content, including the embedded queries the pages use", async () => {
    const journal = await kath.client
      .from("journals")
      .insert({ couple_id: coupleId, created_by: kath.id, title: "The day we met", body: "It rained.", entry_date: "2026-09-14" })
      .select("id")
      .single();
    expect(journal.error).toBeNull();
    journalId = journal.data!.id;

    const place = await john.client.from("places").insert({ couple_id: coupleId, created_by: john.id, name: "Café Lumière", category: "food" }).select("id").single();
    expect(place.error).toBeNull();
    expect((await kath.client.from("place_journals").insert({ couple_id: coupleId, place_id: place.data!.id, journal_id: journalId })).error).toBeNull();
    expect(
      (await john.client.from("events").insert({ couple_id: coupleId, created_by: john.id, title: "Dinner", starts_at: new Date(Date.now() + 86_400_000).toISOString(), place_id: place.data!.id })).error,
    ).toBeNull();
    expect((await kath.client.from("milestones").insert({ couple_id: coupleId, created_by: kath.id, title: "First date", occurred_on: "2026-09-14", icon: "heart" })).error).toBeNull();
    expect((await john.client.from("journal_reflections").insert({ couple_id: coupleId, journal_id: journalId, author_id: john.id, visibility: "private", body: "Only mine" })).error).toBeNull();
    expect((await kath.client.from("journal_reflections").insert({ couple_id: coupleId, journal_id: journalId, author_id: kath.id, visibility: "shared", body: "So nervous" })).error).toBeNull();
    expect((await john.client.from("notes").insert({ couple_id: coupleId, author_id: john.id, visibility: "private", body: "Ring size?" })).error).toBeNull();

    const story = await kath.client.from("journals").select("id, title, journal_photos(storage_path), journal_reflections(count)").eq("id", journalId).single();
    expect(story.error).toBeNull();
    expect(story.data!.journal_reflections[0].count).toBe(1); // John's private reflection is invisible to Kath

    const places = await kath.client.from("places").select("id, place_journals(journal_id, journals(id, title))");
    expect(places.error).toBeNull();
    expect(places.data![0].place_journals[0].journals?.title).toBe("The day we met");

    const events = await kath.client.from("events").select("id, title, places(name)");
    expect(events.error).toBeNull();
    expect(events.data![0].places?.name).toBe("Café Lumière");

    const kathNotes = await kath.client.from("notes").select("id").eq("couple_id", coupleId);
    expect(kathNotes.data).toHaveLength(0);
  });

  it("photos: signed upload into the couple's folder, readable by both partners through signed URLs", async () => {
    photoPath = uploadPath(coupleId, "journals", journalId);
    const signed = await kath.client.storage.from(BUCKET).createSignedUploadUrl(photoPath);
    expect(signed.error).toBeNull();

    const uploaded = await kath.client.storage.from(BUCKET).uploadToSignedUrl(photoPath, signed.data!.token, new Blob([PNG], { type: "image/png" }), {
      contentType: "image/png",
    });
    expect(uploaded.error).toBeNull();

    const dir = photoPath.slice(0, photoPath.lastIndexOf("/"));
    const file = photoPath.slice(photoPath.lastIndexOf("/") + 1);
    const listed = await kath.client.storage.from(BUCKET).list(dir, { search: file });
    expect(listed.data?.map((o) => o.name)).toContain(file);

    const thumbPath = uploadPath(coupleId, "journals", journalId, "webp");
    const thumbSigned = await kath.client.storage.from(BUCKET).createSignedUploadUrl(thumbPath);
    expect(thumbSigned.error).toBeNull();
    const thumbUploaded = await kath.client.storage
      .from(BUCKET)
      .uploadToSignedUrl(thumbPath, thumbSigned.data!.token, new Blob([PNG], { type: "image/webp" }), { contentType: "image/webp", cacheControl: "31536000" });
    expect(thumbUploaded.error).toBeNull();

    const row = await kath.client.from("journal_photos").insert({
      couple_id: coupleId,
      journal_id: journalId,
      uploaded_by: kath.id,
      storage_path: photoPath,
      thumb_path: thumbPath,
      width: 1,
      height: 1,
      content_type: "image/png",
      size_bytes: PNG.length,
    });
    expect(row.error).toBeNull();

    const urls = await john.client.storage.from(BUCKET).createSignedUrls([photoPath, thumbPath], 60);
    expect(urls.error).toBeNull();
    const image = await fetch(urls.data![0].signedUrl!);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/png");
    expect((await fetch(urls.data![1].signedUrl!)).status).toBe(200);

    const repoint = await kath.client.from("journal_photos").update({ thumb_path: photoPath }).eq("storage_path", photoPath);
    expect(repoint.error?.code).toBe("42501");

    const memories = await john.client.from("journal_photos").select("id, storage_path, thumb_path, width, height, journals(title, entry_date)");
    expect(memories.error).toBeNull();
    expect(memories.data![0]).toMatchObject({ thumb_path: thumbPath, width: 1, height: 1 });
    expect(memories.data![0].journals?.title).toBe("The day we met");
  });

  it("storage rejects outsiders, forged paths, other people's avatar folders and disallowed types", async () => {
    const outsiderSign = await outsider.client.storage.from(BUCKET).createSignedUploadUrl(uploadPath(coupleId, "cover"));
    expect(outsiderSign.error).not.toBeNull();

    const outsiderRead = await outsider.client.storage.from(BUCKET).createSignedUrls([photoPath], 60);
    expect(outsiderRead.data?.[0]?.signedUrl ?? null).toBeNull();

    const outsiderList = await outsider.client.storage.from(BUCKET).list(photoPath.slice(0, photoPath.lastIndexOf("/")));
    expect(outsiderList.data ?? []).toHaveLength(0);

    const forgedName = await kath.client.storage.from(BUCKET).createSignedUploadUrl(`couples/${coupleId}/cover/holiday.png`);
    expect(forgedName.error).not.toBeNull();

    const traversal = await kath.client.storage.from(BUCKET).createSignedUploadUrl(`couples/${coupleId}/journals/${journalId}/../../x/${randomUUID()}.png`);
    expect(traversal.error).not.toBeNull();

    const partnersAvatar = await kath.client.storage.from(BUCKET).createSignedUploadUrl(uploadPath(coupleId, "avatars", john.id));
    expect(partnersAvatar.error).not.toBeNull();

    const svg = await kath.client.storage.from(BUCKET).upload(uploadPath(coupleId, "cover"), new Blob(["<svg/>"], { type: "image/svg+xml" }), {
      contentType: "image/svg+xml",
    });
    expect(svg.error).not.toBeNull();
  });

  it("letters stay sealed for the recipient until they unlock", async () => {
    const sealed = await john.client.rpc("create_letter", {
      p_couple_id: coupleId,
      p_title: "Open on our anniversary",
      p_content: "Sealed words",
      p_unlock_at: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    });
    expect(sealed.error).toBeNull();
    sealedLetterId = sealed.data as string;

    const open = await john.client.rpc("create_letter", {
      p_couple_id: coupleId,
      p_title: "Read me now",
      p_content: "Open words",
      p_unlock_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(open.error).toBeNull();
    openLetterId = open.data as string;

    const envelope = await kath.client.from("letters").select("id, title").eq("id", sealedLetterId);
    expect(envelope.data).toHaveLength(1);
    const sealedContent = await kath.client.from("letter_contents").select("content").eq("letter_id", sealedLetterId);
    expect(sealedContent.error).toBeNull();
    expect(sealedContent.data).toHaveLength(0);

    const authorView = await john.client.from("letter_contents").select("content").eq("letter_id", sealedLetterId).single();
    expect(authorView.data?.content).toBe("Sealed words");

    const openContent = await kath.client.from("letter_contents").select("content").eq("letter_id", openLetterId).single();
    expect(openContent.data?.content).toBe("Open words");

    const earlyUnlock = await kath.client.from("letters").update({ unlock_at: new Date().toISOString() }).eq("id", sealedLetterId).select("id");
    expect(earlyUnlock.data ?? []).toHaveLength(0);

    expect((await kath.client.rpc("mark_letter_opened", { p_letter_id: openLetterId })).error).toBeNull();
  });

  it("an outsider sees nothing and changes nothing", async () => {
    for (const table of ["couples", "couple_members", "couple_themes", "journals", "journal_photos", "journal_reflections", "events", "milestones", "places", "notes", "letters", "letter_contents"] as const) {
      const column = table === "couples" ? "id" : "couple_id";
      const untyped = outsider.client as unknown as SupabaseClient;
      const { data, error } = await untyped.from(table).select("*").eq(column, coupleId);
      expect(error, table).toBeNull();
      expect(data, table).toHaveLength(0);
    }
    const hijack = await outsider.client.from("journals").update({ title: "hacked" }).eq("id", journalId).select("id");
    expect(hijack.data ?? []).toHaveLength(0);
    const intrude = await outsider.client.from("journals").insert({ couple_id: coupleId, created_by: outsider.id, title: "intruder" });
    expect(intrude.error?.code).toBe("42501");
  });

  it("invitation rules hold on the live database", async () => {
    const full = await john.client.rpc("create_couple_invitation", {
      p_couple_id: coupleId,
      p_invited_email: "third@example.com",
      p_token_hash: generateInvitationToken().tokenHash,
      p_ttl_days: 7,
    });
    expect(full.error?.message).toBe("couple_full");

    outsiderInvite = generateInvitationToken();
    const solo = await outsider.client.rpc("create_couple", {
      p_creator_name: "Outsider",
      p_partner_email: `our-story-e2e+nobody-${run}@example.com`,
      p_invite_token_hash: outsiderInvite.tokenHash,
    });
    expect(solo.error).toBeNull();
    outsiderCoupleId = (solo.data as { couple_id: string }).couple_id;
    outsiderInvitationId = (solo.data as { invitation_id: string }).invitation_id;
    createdCoupleIds.push(outsiderCoupleId);

    const tooSoon = await outsider.client.rpc("resend_couple_invitation", {
      p_invitation_id: outsiderInvitationId,
      p_token_hash: generateInvitationToken().tokenHash,
    });
    expect(tooSoon.error?.message).toBe("resend_too_soon");

    const notTheirs = await john.client.rpc("cancel_couple_invitation", { p_invitation_id: outsiderInvitationId });
    expect(notTheirs.error?.message).toBe("invitation_not_found");

    const accountState = await john.client.rpc("get_auth_account_state", { p_email: kath.email });
    expect(accountState.error?.code).toBe("42501");
  });

  it("the app renders each page for Kath with live data, and hides it from the outsider", async (ctx) => {
    if (!(await appReachable())) ctx.skip();

    const kathCookies = await sessionCookieHeader(kath);
    const get = async (path: string, cookie?: string) => {
      const res = await fetch(`${APP_URL}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual", signal: AbortSignal.timeout(120_000) });
      return { status: res.status, location: res.headers.get("location"), html: await res.text() };
    };

    const pages: Array<[string, string[]]> = [
      ["/home", ["John ♡ Kath", "Our Little World", "The day we met"]],
      ["/story", ["The day we met"]],
      [`/story/${journalId}`, ["The day we met", "So nervous", "Café Lumière"]],
      ["/memories", ["Every picture, in one place"]],
      ["/calendar?month=2026-09&date=2026-09-14", ["September 2026", "The day we met", "First date", "Your story began", "Milestones", "Photos"]],
      ["/milestones", ["First date"]],
      ["/places", ["Café Lumière"]],
      ["/notes", ["Little things worth keeping"]],
      ["/letters", ["Open on our anniversary", "Read me now"]],
      [`/letters/${sealedLetterId}`, ["A letter is waiting for you."]],
      [`/letters/${openLetterId}`, ["Open words"]],
      ["/settings", ["John &amp; Kath", "Kath", "Our Little World"]],
    ];

    for (const [path, expected] of pages) {
      const page = await get(path, kathCookies);
      expect(page.status, path).toBe(200);
      for (const text of expected) expect(page.html, `${path} should show ${text}`).toContain(text);
      expect(page.html, `${path} rendered an error screen`).not.toMatch(/didn&#x27;t load|couldn&#x27;t load/);
    }

    // Private content never reaches the partner's HTML.
    const story = await get(`/story/${journalId}`, kathCookies);
    expect(story.html).not.toContain("Only mine");
    const sealed = await get(`/letters/${sealedLetterId}`, kathCookies);
    expect(sealed.html).not.toContain("Sealed words");

    const outsiderCookies = await sessionCookieHeader(outsider);
    const probe = await get(`/story/${journalId}`, outsiderCookies);
    expect(probe.html).not.toContain("The day we met");
    expect(probe.html).toContain("part of your story");

    const signedOut = await get("/home");
    expect(signedOut.status).toBe(307);
    expect(signedOut.location).toContain("/login");

    const invitation = await get(`/invite/${outsiderInvite.token}`);
    expect(invitation.html).toContain("invited you to join their private space");
  }, 600_000);
});
