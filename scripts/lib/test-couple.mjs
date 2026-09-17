/**
 * Throwaway test couple for scripts that drive the running app
 * (visual-check, perf-check). Creates pre-confirmed users in the Supabase
 * project from .env.local (no emails are sent) with sample content, and
 * removes everything it created in cleanup().
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
export const APP = process.env.LIVE_APP_URL ?? "http://localhost:3000";

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, clientOptions);
const run = randomBytes(3).toString("hex");
const created = { users: [], couples: [] };

async function user(name) {
  const email = `our-story-visual+${name.toLowerCase()}-${run}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, clientOptions);
  const { data: s, error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, email, client, session: s.session };
}

async function sampleImage(hueA, hueB, label, width = 1200, height = 900) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hueA} 70% 70%)"/><stop offset="1" stop-color="hsl(${hueB} 65% 45%)"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * 0.72}" cy="${height * 0.3}" r="${height * 0.14}" fill="hsl(45 95% 85%)" opacity=".9"/>
    <path d="M0 ${height * 0.75} Q ${width * 0.3} ${height * 0.55} ${width * 0.55} ${height * 0.72} T ${width} ${height * 0.65} V ${height} H 0 Z" fill="hsl(${hueB} 40% 25%)" opacity=".55"/>
    <text x="40" y="${height - 40}" font-family="Georgia" font-size="56" fill="white" opacity=".85">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

async function addPhoto(client, userId, coupleId, journalId, image) {
  const bucket = client.storage.from("couple-media");
  const meta = await sharp(image).metadata();
  const path = `couples/${coupleId}/journals/${journalId}/${randomUUID()}.jpg`;
  const thumbPath = `couples/${coupleId}/journals/${journalId}/${randomUUID()}.webp`;
  const thumb = await sharp(image).resize(720, 720, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  for (const [p, body, type] of [[path, image, "image/jpeg"], [thumbPath, thumb, "image/webp"]]) {
    const { error } = await bucket.upload(p, body, { contentType: type, cacheControl: "31536000" });
    if (error) throw error;
  }
  const { error } = await client.from("journal_photos").insert({
    couple_id: coupleId, journal_id: journalId, uploaded_by: userId, storage_path: path, thumb_path: thumbPath,
    width: meta.width, height: meta.height, content_type: "image/jpeg", size_bytes: image.length,
  });
  if (error) throw error;
}

export async function cookiesFor(session) {
  const jar = new Map();
  const server = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)) },
  });
  await server.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  return [...jar].map(([name, value]) => ({ name, value, url: APP }));
}

export async function seed() {
  const john = await user("John");
  const kath = await user("Kath");
  const token = randomBytes(32).toString("base64url");
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: couple, error } = await john.client.rpc("create_couple", {
    p_creator_name: "John", p_partner_email: kath.email, p_invite_token_hash: tokenHash, p_couple_name: "John & Kath", p_story_began_on: "2025-09-14",
  });
  if (error) throw error;
  const coupleId = couple.couple_id;
  created.couples.push(coupleId);
  const accepted = await kath.client.rpc("accept_couple_invitation", { p_token: token, p_display_name: "Kath" });
  if (accepted.error) throw accepted.error;
  await john.client.from("couples").update({ description: "Two people, one very long list of adventures." }).eq("id", coupleId);

  const journals = [
    { title: "The day we met", entry_date: "2025-09-14", mood: "giddy", body: "It rained the whole way home and neither of us minded. We shared one umbrella and missed two buses on purpose." },
    { title: "Sunset in Batangas", entry_date: "2026-08-22", mood: "sun-kissed", body: "Sand everywhere, sunburnt noses, the best grilled squid of our lives." },
    { title: "Movie night fort", entry_date: "2026-09-10", mood: "cozy", body: null },
  ];
  const ids = [];
  for (const [i, j] of journals.entries()) {
    const author = i % 2 ? john : kath;
    const { data, error: jErr } = await author.client.from("journals").insert({ couple_id: coupleId, created_by: author.id, ...j }).select("id").single();
    if (jErr) throw jErr;
    ids.push(data.id);
  }
  await addPhoto(kath.client, kath.id, coupleId, ids[0], await sampleImage(200, 260, "rainy night"));
  await addPhoto(kath.client, kath.id, coupleId, ids[0], await sampleImage(330, 20, "umbrella", 900, 1200));
  await addPhoto(john.client, john.id, coupleId, ids[1], await sampleImage(25, 320, "golden hour"));
  await addPhoto(john.client, john.id, coupleId, ids[1], await sampleImage(180, 220, "the sea", 1000, 1000));
  await addPhoto(john.client, john.id, coupleId, ids[1], await sampleImage(40, 10, "squid!", 900, 1200));

  await kath.client.from("journal_reflections").insert([
    { couple_id: coupleId, journal_id: ids[0], author_id: kath.id, visibility: "shared", body: "I knew right then. Don't tell him." },
    { couple_id: coupleId, journal_id: ids[0], author_id: kath.id, visibility: "private", body: "Private: he's cute when he's nervous." },
  ]);
  await john.client.from("journal_reflections").insert({ couple_id: coupleId, journal_id: ids[0], author_id: john.id, visibility: "shared", body: "Best missed bus ever." });
  const soon = (days, hour = 19) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  const { data: place, error: placeError } = await john.client.from("places").insert({ couple_id: coupleId, created_by: john.id, name: "Café Lumière", category: "food", status: "visited", address: "Maginhawa St", first_visited_on: "2025-09-14", description: "Where it all started." }).select("id").single();
  if (placeError) throw placeError;
  await john.client.from("places").insert({ couple_id: coupleId, created_by: john.id, name: "Kyoto", category: "travel", status: "wishlist", description: "Autumn leaves, someday." });
  await john.client.from("events").insert([
    { couple_id: coupleId, created_by: john.id, title: "Anniversary dinner", starts_at: soon(2), all_day: false, location: "Café Lumière", place_id: place.id },
    { couple_id: coupleId, created_by: john.id, title: "Beach weekend", starts_at: soon(9, 0), all_day: true, location: null, place_id: null },
  ]);
  await kath.client.from("milestones").insert([
    { couple_id: coupleId, created_by: kath.id, title: "First date", occurred_on: "2025-09-14", icon: "heart", description: "Umbrella for two." },
    { couple_id: coupleId, created_by: kath.id, title: "Moved in together", occurred_on: "2026-06-01", icon: "home", description: null },
  ]);
  await kath.client.from("notes").insert([
    { couple_id: coupleId, author_id: kath.id, visibility: "shared", title: "Groceries", body: "mangoes\nsquid ink pasta\nflowers for no reason", pinned: true },
    { couple_id: coupleId, author_id: kath.id, visibility: "private", title: "Gift ideas", body: "that film camera he keeps looking at", pinned: false },
  ]);
  await john.client.rpc("create_letter", { p_couple_id: coupleId, p_title: "Open on our anniversary", p_content: "Dear Kath...", p_unlock_at: soon(60) });
  await john.client.rpc("create_letter", { p_couple_id: coupleId, p_title: "For a rainy day", p_content: "Hey you. Remember the umbrella? I'd miss every bus with you.", p_unlock_at: soon(-1) });
  return { kath, journalIds: ids };
}

export async function cleanup() {
  for (const coupleId of created.couples) {
    const { data: folders } = await admin.storage.from("couple-media").list(`couples/${coupleId}/journals`, { limit: 100 });
    for (const folder of folders ?? []) {
      const dir = `couples/${coupleId}/journals/${folder.name}`;
      const { data: files } = await admin.storage.from("couple-media").list(dir, { limit: 100 });
      if (files?.length) await admin.storage.from("couple-media").remove(files.map((f) => `${dir}/${f.name}`));
    }
  }
  if (created.couples.length) await admin.from("couples").delete().in("id", created.couples);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  console.log(`cleanup: removed ${created.users.length} users, ${created.couples.length} couples`);
}


export function launchBrowser() {
  return chromium.launch({ channel: "msedge" }).catch(() => chromium.launch({ channel: "chrome" }));
}
