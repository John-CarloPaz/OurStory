import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateInvitationToken } from "@/lib/invitations/token";
import { TestDatabase, type TestUser } from "./harness";

/**
 * The example journey from the product brief, at the database layer:
 * John creates "John & Kath", invites kath@example.com, Kath joins, both use
 * the space, and neither can see another couple's world.
 */

let db: TestDatabase;
let john: TestUser;
let kath: TestUser;
let coupleId: string;
let inviteToken: string;
let otherCouple: { id: string; journalId: string; member: TestUser };

beforeAll(async () => {
  db = await TestDatabase.create();

  // Another couple already using the product.
  const alex = await db.createUser("alex@example.com", "Alex");
  const maya = await db.createUser("maya@example.com", "Maya");
  const alexInvite = generateInvitationToken();
  const alexSpace = await db.rpc<{ couple_id: string }>(alex, "create_couple", ["Alex", maya.email, alexInvite.tokenHash, null, null, 7]);
  await db.rpc(maya, "accept_couple_invitation", [alexInvite.token, "Maya"]);
  const journal = await db.query<{ id: string }>(
    alex,
    `insert into journals (couple_id, created_by, title) values ($1, auth.uid(), 'Two Idiots, One Adventure') returning id`,
    [alexSpace.couple_id],
  );
  otherCouple = { id: alexSpace.couple_id, journalId: journal.rows[0].id, member: alex };
}, 120_000);

afterAll(async () => {
  await db?.destroy();
});

describe("John and Kath", () => {
  it("John creates an account and the space 'John & Kath'", async () => {
    john = await db.createUser("john@example.com", "John");
    const invite = generateInvitationToken();
    inviteToken = invite.token;

    const result = await db.rpc<Record<string, string>>(john, "create_couple", [
      "John",
      "kath@example.com",
      invite.tokenHash,
      "John & Kath",
      "2026-09-14",
      7,
    ]);
    coupleId = result.couple_id;

    expect(result).toMatchObject({ invited_email: "kath@example.com", inviter_name: "John", couple_label: "John & Kath" });

    const theme = await db.query(john, `select name, card_style, typography from couple_themes where couple_id = $1`, [coupleId]);
    expect(theme.rows[0]).toEqual({ name: "paper", card_style: "glass", typography: "editorial" });
  });

  it("Kath opens the invitation and sees that John invited her", async () => {
    const preview = await db.rpc<Record<string, unknown>>(null, "get_invitation_preview", [inviteToken]);
    expect(preview).toMatchObject({
      status: "valid",
      inviter_name: "John",
      couple_label: "John & Kath",
      display_title: "Our Little World",
      invited_email: "kath@example.com",
    });
  });

  it("Kath creates an account and is added to John's couple automatically", async () => {
    kath = await db.createUser("kath@example.com", "Kath");
    const joined = await db.rpc<{ couple_id: string }>(kath, "accept_couple_invitation", [inviteToken, "Kath"]);
    expect(joined.couple_id).toBe(coupleId);
  });

  it("Kath lands on 'John ♡ Kath — Our Little World'", async () => {
    const couple = await db.query(kath, `select name, display_title, story_began_on::text from couples where id = $1`, [coupleId]);
    expect(couple.rows[0]).toEqual({ name: "John & Kath", display_title: "Our Little World", story_began_on: "2026-09-14" });

    const members = await db.query<{ display_name: string }>(
      kath,
      `select p.display_name from couple_members cm join profiles p on p.id = cm.user_id
       where cm.couple_id = $1 order by cm.joined_at`,
      [coupleId],
    );
    expect(members.rows.map((m) => m.display_name).join(" ♡ ")).toBe("John ♡ Kath");
  });

  it("both can create journals, photos, events, milestones, reflections and letters, and customize the space", async () => {
    const journal = await db.query<{ id: string }>(
      kath,
      `insert into journals (couple_id, created_by, title, body) values ($1, auth.uid(), 'The day we met', 'Rain.') returning id`,
      [coupleId],
    );
    const journalId = journal.rows[0].id;

    const photoPath = `couples/${coupleId}/journals/${journalId}/${randomUUID()}.jpg`;
    await db.query(john, `insert into storage.objects (bucket_id, name, owner) values ('couple-media', $1, auth.uid())`, [photoPath]);
    await db.query(
      john,
      `insert into journal_photos (couple_id, journal_id, uploaded_by, storage_path, content_type) values ($1, $2, auth.uid(), $3, 'image/jpeg')`,
      [coupleId, journalId, photoPath],
    );

    await db.query(john, `insert into events (couple_id, created_by, title, starts_at) values ($1, auth.uid(), 'Dinner', now() + interval '2 days')`, [coupleId]);
    await db.query(kath, `insert into milestones (couple_id, created_by, title, occurred_on) values ($1, auth.uid(), 'First date', '2026-09-14')`, [coupleId]);
    await db.query(
      kath,
      `insert into journal_reflections (couple_id, journal_id, author_id, visibility, body) values ($1, $2, auth.uid(), 'shared', 'I was so nervous')`,
      [coupleId, journalId],
    );
    await db.rpc(john, "create_letter", [coupleId, "Open on our anniversary", "Dear Kath...", new Date(Date.now() + 365 * 86_400_000)]);
    await db.query(kath, `update couple_themes set name = 'blush', primary_color = '#b64f6f' where couple_id = $1`, [coupleId]);

    const counts = await db.query(
      john,
      `select
         (select count(*) from journals where couple_id = $1)            as journals,
         (select count(*) from journal_photos where couple_id = $1)      as photos,
         (select count(*) from events where couple_id = $1)              as events,
         (select count(*) from milestones where couple_id = $1)          as milestones,
         (select count(*) from journal_reflections where couple_id = $1) as reflections,
         (select count(*) from letters where couple_id = $1)             as letters,
         (select name from couple_themes where couple_id = $1)           as theme`,
      [coupleId],
    );
    expect(counts.rows[0]).toEqual({ journals: "1", photos: "1", events: "1", milestones: "1", reflections: "1", letters: "1", theme: "blush" });

    // Kath sees the letter's envelope but not its words until it opens.
    const envelope = await db.query(kath, `select title from letters where couple_id = $1`, [coupleId]);
    const words = await db.query(kath, `select content from letter_contents where couple_id = $1`, [coupleId]);
    expect(envelope.rowCount).toBe(1);
    expect(words.rowCount).toBe(0);
  });

  it("neither can access another couple's data, and the other couple cannot see theirs", async () => {
    for (const user of [john, kath]) {
      const theirs = await db.query(user, `select id from journals where id = $1`, [otherCouple.journalId]);
      expect(theirs.rowCount).toBe(0);
      const couple = await db.query(user, `select id from couples where id = $1`, [otherCouple.id]);
      expect(couple.rowCount).toBe(0);
    }
    const ours = await db.query(otherCouple.member, `select id from journals where couple_id = $1`, [coupleId]);
    expect(ours.rowCount).toBe(0);
  });

  it("a third person cannot use Kath's invitation again", async () => {
    const stranger = await db.createUser("stranger@example.com", "Stranger");
    await expect(db.rpc(stranger, "accept_couple_invitation", [inviteToken, null])).rejects.toThrow(/invitation_email_mismatch/);
    expect(await db.rpc(null, "get_invitation_preview", [inviteToken])).toEqual({ status: "accepted", inviter_name: null });
  });
});
