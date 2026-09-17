import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateInvitationToken } from "@/lib/invitations/token";
import { TestDatabase, expectDbError, type TestUser } from "./harness";

/**
 * Tenant isolation, content privacy, letters, invitations and storage —
 * enforced by the database itself (RLS, grants, constraints, RPC checks).
 *
 * Tenant A: Alex + Maya
 * Tenant B: John + Sarah
 * Tenant C: David + Emma   (David also owns a solo space, Tenant D)
 */

type CreateCoupleResult = { couple_id: string; invitation_id: string; invited_email: string };

type Tenant = {
  coupleId: string;
  a: TestUser;
  b: TestUser;
  journalId: string;
  privateReflectionA: string;
  sharedReflectionA: string;
  privateReflectionB: string;
  photoId: string;
  photoPath: string;
  eventId: string;
  milestoneId: string;
  placeId: string;
  privateNoteA: string;
  sharedNoteA: string;
  sealedLetterAtoB: string;
  openLetterBtoA: string;
};

const TENANT_TABLES = [
  "couples",
  "couple_members",
  "couple_themes",
  "couple_invitations",
  "journals",
  "journal_reflections",
  "journal_photos",
  "places",
  "place_journals",
  "events",
  "milestones",
  "notes",
  "letters",
  "letter_contents",
] as const;

function tenantColumn(table: (typeof TENANT_TABLES)[number]) {
  return table === "couples" ? "id" : "couple_id";
}

let db: TestDatabase;
let A: Tenant;
let B: Tenant;
let C: Tenant;
let D: { coupleId: string; journalId: string };
let someoneElse: TestUser;

async function createSpace(creator: TestUser, partnerEmail: string, coupleName: string | null = null) {
  const { token, tokenHash } = generateInvitationToken();
  const result = await db.rpc<CreateCoupleResult>(creator, "create_couple", [
    creator.name,
    partnerEmail,
    tokenHash,
    coupleName,
    "2026-09-14",
    7,
  ]);
  return { coupleId: result.couple_id, invitationId: result.invitation_id, token };
}

function mediaPath(coupleId: string, area: string, owner?: string) {
  return owner
    ? `couples/${coupleId}/${area}/${owner}/${randomUUID()}.jpg`
    : `couples/${coupleId}/${area}/${randomUUID()}.jpg`;
}

async function seedTenant(a: TestUser, b: TestUser, coupleId: string): Promise<Tenant> {
  return db.as(a, async (q) => {
    const one = async (sql: string, params: unknown[]) => (await q<{ id: string }>(sql, params)).rows[0].id;

    const journalId = await one(
      `insert into journals (couple_id, created_by, title, body) values ($1, auth.uid(), $2, 'A day') returning id`,
      [coupleId, `${a.name} & ${b.name}'s first trip`],
    );
    const privateReflectionA = await one(
      `insert into journal_reflections (couple_id, journal_id, author_id, visibility, body)
       values ($1, $2, auth.uid(), 'private', 'my private thought') returning id`,
      [coupleId, journalId],
    );
    const sharedReflectionA = await one(
      `insert into journal_reflections (couple_id, journal_id, author_id, visibility, body)
       values ($1, $2, auth.uid(), 'shared', 'shared thought') returning id`,
      [coupleId, journalId],
    );
    const photoPath = mediaPath(coupleId, "journals", journalId);
    await q(`insert into storage.objects (bucket_id, name, owner) values ('couple-media', $1, auth.uid())`, [photoPath]);
    const photoId = await one(
      `insert into journal_photos (couple_id, journal_id, uploaded_by, storage_path, content_type, size_bytes)
       values ($1, $2, auth.uid(), $3, 'image/jpeg', 1024) returning id`,
      [coupleId, journalId, photoPath],
    );
    const placeId = await one(
      `insert into places (couple_id, created_by, name) values ($1, auth.uid(), 'The little cafe') returning id`,
      [coupleId],
    );
    await q(`insert into place_journals (couple_id, place_id, journal_id) values ($1, $2, $3)`, [
      coupleId,
      placeId,
      journalId,
    ]);
    const eventId = await one(
      `insert into events (couple_id, created_by, title, starts_at, place_id)
       values ($1, auth.uid(), 'Dinner', now() + interval '3 days', $2) returning id`,
      [coupleId, placeId],
    );
    const milestoneId = await one(
      `insert into milestones (couple_id, created_by, title, occurred_on) values ($1, auth.uid(), 'First date', '2026-09-14') returning id`,
      [coupleId],
    );
    const privateNoteA = await one(
      `insert into notes (couple_id, author_id, visibility, body) values ($1, auth.uid(), 'private', 'gift ideas') returning id`,
      [coupleId],
    );
    const sharedNoteA = await one(
      `insert into notes (couple_id, author_id, visibility, body) values ($1, auth.uid(), 'shared', 'groceries') returning id`,
      [coupleId],
    );
    const sealedLetterAtoB = (
      await q<{ id: string }>(`select public.create_letter($1, 'Open on our anniversary', 'sealed words', now() + interval '90 days') as id`, [
        coupleId,
      ])
    ).rows[0].id;
    return {
      coupleId,
      a,
      b,
      journalId,
      privateReflectionA,
      sharedReflectionA,
      privateReflectionB: "",
      photoId,
      photoPath,
      eventId,
      milestoneId,
      placeId,
      privateNoteA,
      sharedNoteA,
      sealedLetterAtoB,
      openLetterBtoA: "",
    };
  }).then(async (tenant) =>
    db.as(b, async (q) => {
      tenant.privateReflectionB = (
        await q<{ id: string }>(
          `insert into journal_reflections (couple_id, journal_id, author_id, visibility, body)
           values ($1, $2, auth.uid(), 'private', 'partner private thought') returning id`,
          [coupleId, tenant.journalId],
        )
      ).rows[0].id;
      tenant.openLetterBtoA = (
        await q<{ id: string }>(`select public.create_letter($1, 'Read me now', 'open words', now() - interval '1 day') as id`, [
          coupleId,
        ])
      ).rows[0].id;
      return tenant;
    }),
  );
}

async function buildTenant(aEmail: string, aName: string, bEmail: string, bName: string) {
  const a = await db.createUser(aEmail, aName);
  const b = await db.createUser(bEmail, bName);
  const space = await createSpace(a, b.email);
  await db.rpc(b, "accept_couple_invitation", [space.token, b.name]);
  return seedTenant(a, b, space.coupleId);
}

beforeAll(async () => {
  db = await TestDatabase.create();
  someoneElse = await db.createUser("someoneelse@example.com", "Someone");

  // Tenant A is built step by step so the email-binding rule can be checked
  // against the real invitation before Maya accepts it.
  const alex = await db.createUser("alex@example.com", "Alex");
  const maya = await db.createUser("maya@example.com", "Maya");
  const spaceA = await createSpace(alex, "maya@example.com", "Alex & Maya");
  await expectDbError(db.rpc(someoneElse, "accept_couple_invitation", [spaceA.token, null]), "invitation_email_mismatch");
  await db.rpc(maya, "accept_couple_invitation", [spaceA.token, "Maya"]);
  A = await seedTenant(alex, maya, spaceA.coupleId);

  B = await buildTenant("john@example.com", "John", "sarah@example.com", "Sarah");
  C = await buildTenant("david@example.com", "David", "emma@example.com", "Emma");

  const spaceD = await createSpace(C.a, "future@example.com", "David's travel space");
  const journalD = await db.query<{ id: string }>(
    C.a,
    `insert into journals (couple_id, created_by, title) values ($1, auth.uid(), 'Solo trip') returning id`,
    [spaceD.coupleId],
  );
  D = { coupleId: spaceD.coupleId, journalId: journalD.rows[0].id };
}, 120_000);

afterAll(async () => {
  await db?.destroy();
});

// ---------------------------------------------------------------------------

describe("tenant isolation", () => {
  it("members can read every table of their own tenant", async () => {
    for (const tenant of [A, B, C]) {
      for (const user of [tenant.a, tenant.b]) {
        for (const table of TENANT_TABLES) {
          const column = tenantColumn(table);
          const selectList = table === "couple_invitations" ? "id" : "*";
          const { rowCount } = await db.query(user, `select ${selectList} from ${table} where ${column} = $1`, [tenant.coupleId]);
          expect(rowCount, `${user.email} reading own ${table}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it.each([
    ["A", () => A, () => [B, C]],
    ["B", () => B, () => [A, C]],
    ["C", () => C, () => [A, B]],
  ])("users of tenant %s cannot read any other tenant's rows", async (_label, own, others) => {
    for (const user of [own().a, own().b]) {
      for (const other of others()) {
        for (const table of TENANT_TABLES) {
          const column = tenantColumn(table);
          const selectList = table === "couple_invitations" ? "id" : "*";
          const { rowCount } = await db.query(user, `select ${selectList} from ${table} where ${column} = $1`, [other.coupleId]);
          expect(rowCount, `${user.email} reading ${table} of another tenant`).toBe(0);
        }
      }
    }
  });

  it("changing UUIDs by hand never exposes another tenant's journal, photo, event, milestone, letter, place or theme", async () => {
    const probes: Array<[string, string, string]> = [
      ["journals", "id", B.journalId],
      ["journal_photos", "id", B.photoId],
      ["journal_reflections", "id", B.sharedReflectionA],
      ["events", "id", B.eventId],
      ["milestones", "id", B.milestoneId],
      ["places", "id", B.placeId],
      ["notes", "id", B.sharedNoteA],
      ["letters", "id", B.openLetterBtoA],
      ["letter_contents", "letter_id", B.openLetterBtoA],
      ["couple_themes", "couple_id", B.coupleId],
      ["couples", "id", B.coupleId],
    ];
    for (const [table, column, id] of probes) {
      const { rowCount } = await db.query(A.a, `select * from ${table} where ${column} = $1`, [id]);
      expect(rowCount, `probe ${table}`).toBe(0);
    }
  });

  it("cannot update or delete another tenant's rows", async () => {
    const updates = [
      ["journals", "title = 'hacked'", B.journalId],
      ["events", "title = 'hacked'", B.eventId],
      ["milestones", "title = 'hacked'", B.milestoneId],
      ["places", "name = 'hacked'", B.placeId],
      ["notes", "body = 'hacked'", B.sharedNoteA],
      ["journal_reflections", "body = 'hacked'", B.sharedReflectionA],
      ["journal_photos", "caption = 'hacked'", B.photoId],
      ["couples", "display_title = 'hacked'", B.coupleId],
    ] as const;
    for (const [table, set, id] of updates) {
      const res = await db.query(A.a, `update ${table} set ${set} where id = $1`, [id]);
      expect(res.rowCount, `update ${table}`).toBe(0);
    }
    const themeRes = await db.query(A.a, `update couple_themes set primary_color = '#000000' where couple_id = $1`, [B.coupleId]);
    expect(themeRes.rowCount).toBe(0);

    for (const [table, id] of [
      ["journals", B.journalId],
      ["events", B.eventId],
      ["milestones", B.milestoneId],
      ["places", B.placeId],
      ["letters", B.openLetterBtoA],
    ] as const) {
      const res = await db.query(A.a, `delete from ${table} where id = $1`, [id]);
      expect(res.rowCount, `delete ${table}`).toBe(0);
    }

    const intact = await db.admin(`select title from journals where id = $1`, [B.journalId]);
    expect(intact.rows[0].title).not.toBe("hacked");
  });

  it("cannot insert rows into another tenant", async () => {
    await expectDbError(
      db.query(A.a, `insert into journals (couple_id, created_by, title) values ($1, auth.uid(), 'intruder')`, [B.coupleId]),
      "row-level security",
    );
    await expectDbError(
      db.query(A.a, `insert into events (couple_id, created_by, title, starts_at) values ($1, auth.uid(), 'x', now())`, [B.coupleId]),
      "row-level security",
    );
    await expectDbError(
      db.query(A.a, `insert into places (couple_id, created_by, name) values ($1, auth.uid(), 'x')`, [B.coupleId]),
      "row-level security",
    );
  });

  it("cannot attach own-tenant rows to another tenant's parents (composite foreign keys)", async () => {
    await expectDbError(
      db.query(
        A.a,
        `insert into journal_reflections (couple_id, journal_id, author_id, body) values ($1, $2, auth.uid(), 'x')`,
        [A.coupleId, B.journalId],
      ),
      "23503",
    );
    await expectDbError(
      db.query(A.a, `insert into place_journals (couple_id, place_id, journal_id) values ($1, $2, $3)`, [
        A.coupleId,
        A.placeId,
        B.journalId,
      ]),
      "23503",
    );
    await expectDbError(
      db.query(
        A.a,
        `insert into journal_photos (couple_id, journal_id, uploaded_by, storage_path, content_type)
         values ($1, $2, auth.uid(), $3, 'image/jpeg')`,
        [A.coupleId, A.journalId, mediaPath(B.coupleId, "journals", B.journalId)],
      ),
      "journal_photos_path_scoped",
    );
    await expectDbError(
      db.query(A.a, `insert into events (couple_id, created_by, title, starts_at, place_id) values ($1, auth.uid(), 'x', now(), $2)`, [
        A.coupleId,
        B.placeId,
      ]),
      "23503",
    );
  });

  it("photo thumbnails must live next to their photo and cannot be repointed later", async () => {
    const insertPhoto = (thumb: string) =>
      db.query(
        A.a,
        `insert into journal_photos (couple_id, journal_id, uploaded_by, storage_path, thumb_path, content_type, width, height)
         values ($1, $2, auth.uid(), $3, $4, 'image/jpeg', 4032, 3024)`,
        [A.coupleId, A.journalId, mediaPath(A.coupleId, "journals", A.journalId), thumb],
      );

    await expectDbError(insertPhoto(mediaPath(B.coupleId, "journals", B.journalId)), "journal_photos_thumb_path_scoped");
    await insertPhoto(mediaPath(A.coupleId, "journals", A.journalId).replace(/\.jpg$/, ".webp"));

    await expectDbError(
      db.query(A.a, `update journal_photos set thumb_path = $1 where id = $2`, [mediaPath(A.coupleId, "journals", A.journalId), A.photoId]),
      "permission denied",
    );
  });

  it("scrapbook pages are shared by the couple, private from everyone else, and must be an object", async () => {
    const page = JSON.stringify({ version: 1, page: { paper: "kraft" }, elements: [] });
    const saved = await db.query(A.b, `update journals set scrapbook = $1::jsonb, scrapbook_updated_at = now(), scrapbook_updated_by = auth.uid() where id = $2`, [page, A.journalId]);
    expect(saved.rowCount).toBe(1);
    const readByPartner = await db.query(A.a, `select scrapbook->'page'->>'paper' as paper from journals where id = $1`, [A.journalId]);
    expect(readByPartner.rows[0].paper).toBe("kraft");

    const outsider = await db.query(B.a, `update journals set scrapbook = '{}'::jsonb where id = $1`, [A.journalId]);
    expect(outsider.rowCount).toBe(0);
    expect((await db.query(B.a, `select scrapbook from journals where id = $1`, [A.journalId])).rowCount).toBe(0);

    await expectDbError(db.query(A.a, `update journals set scrapbook = '[1,2,3]'::jsonb where id = $1`, [A.journalId]), "journals_scrapbook_shape");
  });

  it("cannot move a row between tenants, even between two spaces you belong to", async () => {
    await expectDbError(
      db.query(C.a, `update journals set couple_id = $1 where id = $2`, [D.coupleId, C.journalId]),
      "immutable_column",
    );
    await expectDbError(
      db.query(C.a, `update journals set created_by = $1 where id = $2`, [C.b.id, C.journalId]),
      "immutable_column",
    );
  });

  it("supports one user belonging to multiple couples without leaking between them", async () => {
    const david = await db.query(C.a, `select couple_id from couple_members where user_id = auth.uid()`);
    expect(david.rows.map((r) => r.couple_id).sort()).toEqual([C.coupleId, D.coupleId].sort());

    // Emma is only in C: David's second space is invisible to her.
    const emma = await db.query(C.b, `select * from journals where couple_id = $1`, [D.coupleId]);
    expect(emma.rowCount).toBe(0);
  });

  it("profiles are visible only to yourself and your partners", async () => {
    const own = await db.query(A.a, `select id from profiles where id = any($1::uuid[])`, [[A.a.id, A.b.id, B.a.id, B.b.id]]);
    expect(own.rows.map((r) => r.id).sort()).toEqual([A.a.id, A.b.id].sort());
    const update = await db.query(A.a, `update profiles set display_name = 'hacked' where id = $1`, [A.b.id]);
    expect(update.rowCount).toBe(0);
  });

  it("anonymous requests cannot read any table", async () => {
    for (const table of TENANT_TABLES) {
      await expectDbError(db.query(null, `select 1 from ${table} limit 1`), "permission denied");
    }
    await expectDbError(db.query(null, `select 1 from profiles limit 1`), "permission denied");
  });

  it("a user with no couple sees nothing", async () => {
    for (const table of TENANT_TABLES) {
      const selectList = table === "couple_invitations" ? "id" : "*";
      const { rowCount } = await db.query(someoneElse, `select ${selectList} from ${table}`);
      expect(rowCount, table).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------

describe("content privacy", () => {
  it("partner cannot read, edit or delete the other partner's private reflection", async () => {
    const read = await db.query(A.b, `select * from journal_reflections where id = $1`, [A.privateReflectionA]);
    expect(read.rowCount).toBe(0);
    const edit = await db.query(A.b, `update journal_reflections set body = 'x' where id = $1`, [A.privateReflectionA]);
    expect(edit.rowCount).toBe(0);
    const del = await db.query(A.b, `delete from journal_reflections where id = $1`, [A.privateReflectionA]);
    expect(del.rowCount).toBe(0);
  });

  it("author sees their private reflection; both see shared reflections", async () => {
    const author = await db.query(A.a, `select id from journal_reflections where journal_id = $1`, [A.journalId]);
    expect(author.rows.map((r) => r.id).sort()).toEqual([A.privateReflectionA, A.sharedReflectionA].sort());
    const partner = await db.query(A.b, `select id from journal_reflections where journal_id = $1`, [A.journalId]);
    expect(partner.rows.map((r) => r.id).sort()).toEqual([A.sharedReflectionA, A.privateReflectionB].sort());
  });

  it("partner can read but not edit a shared reflection", async () => {
    const edit = await db.query(A.b, `update journal_reflections set body = 'x' where id = $1`, [A.sharedReflectionA]);
    expect(edit.rowCount).toBe(0);
  });

  it("cannot write a reflection or note as someone else", async () => {
    await expectDbError(
      db.query(A.b, `insert into journal_reflections (couple_id, journal_id, author_id, body) values ($1, $2, $3, 'forged')`, [
        A.coupleId,
        A.journalId,
        A.a.id,
      ]),
      "row-level security",
    );
    await expectDbError(
      db.query(A.b, `insert into notes (couple_id, author_id, body) values ($1, $2, 'forged')`, [A.coupleId, A.a.id]),
      "row-level security",
    );
  });

  it("private notes follow the same rule", async () => {
    const partner = await db.query(A.b, `select id from notes where couple_id = $1`, [A.coupleId]);
    expect(partner.rows.map((r) => r.id)).toEqual([A.sharedNoteA]);
  });
});

// ---------------------------------------------------------------------------

describe("letters", () => {
  it("recipient sees the envelope of a sealed letter but not its content", async () => {
    const envelope = await db.query(A.b, `select title, unlock_at from letters where id = $1`, [A.sealedLetterAtoB]);
    expect(envelope.rowCount).toBe(1);
    const content = await db.query(A.b, `select content from letter_contents where letter_id = $1`, [A.sealedLetterAtoB]);
    expect(content.rowCount).toBe(0);
  });

  it("the author can always read their own letter", async () => {
    const content = await db.query(A.a, `select content from letter_contents where letter_id = $1`, [A.sealedLetterAtoB]);
    expect(content.rows[0].content).toBe("sealed words");
  });

  it("recipient can read the content once unlocked", async () => {
    const content = await db.query(A.a, `select content from letter_contents where letter_id = $1`, [A.openLetterBtoA]);
    expect(content.rows[0].content).toBe("open words");
  });

  it("recipient cannot unlock early by editing the letter, and cannot mark a sealed letter opened", async () => {
    const res = await db.query(A.b, `update letters set unlock_at = now() - interval '1 day' where id = $1`, [A.sealedLetterAtoB]);
    expect(res.rowCount).toBe(0);
    await db.rpc(A.b, "mark_letter_opened", [A.sealedLetterAtoB]);
    const row = await db.admin(`select opened_at, unlock_at > now() as sealed from letters where id = $1`, [A.sealedLetterAtoB]);
    expect(row.rows[0]).toMatchObject({ opened_at: null, sealed: true });
  });

  it("author can edit while sealed but not after it has unlocked", async () => {
    await db.rpc(A.a, "update_letter", [A.sealedLetterAtoB, "Open on our anniversary", "edited words", new Date(Date.now() + 86_400_000 * 90)]);
    await expectDbError(
      db.rpc(A.b, "update_letter", [A.openLetterBtoA, "Read me now", "rewritten", new Date()]),
      "letter_not_editable",
    );
  });

  it("recipient can mark an unlocked letter opened", async () => {
    await db.rpc(A.a, "mark_letter_opened", [A.openLetterBtoA]);
    const row = await db.admin(`select opened_at from letters where id = $1`, [A.openLetterBtoA]);
    expect(row.rows[0].opened_at).not.toBeNull();
  });

  it("letters cannot be addressed to someone outside the couple", async () => {
    await expectDbError(
      db.query(A.a, `insert into letters (couple_id, author_id, recipient_id, title, unlock_at) values ($1, auth.uid(), $2, 'x', now())`, [
        A.coupleId,
        B.a.id,
      ]),
      "23503",
    );
  });

  it("a letter needs a partner to exist", async () => {
    await expectDbError(db.rpc(C.a, "create_letter", [D.coupleId, "Hello", "Hi", new Date()]), "partner_not_joined");
  });
});

// ---------------------------------------------------------------------------

describe("invitations", () => {
  async function freshSpace(inviteeEmail: string) {
    const creator = await db.createUser(`creator-${randomUUID().slice(0, 8)}@example.com`, "Creator");
    const space = await createSpace(creator, inviteeEmail);
    return { creator, ...space };
  }

  it("preview works anonymously and reveals only what the token holder needs", async () => {
    const space = await freshSpace("preview@example.com");
    const preview = await db.rpc<Record<string, unknown>>(null, "get_invitation_preview", [space.token]);
    expect(preview).toMatchObject({ status: "valid", inviter_name: "Creator", invited_email: "preview@example.com" });
    expect(preview).not.toHaveProperty("couple_id");
    expect(await db.rpc(null, "get_invitation_preview", [generateInvitationToken().token])).toEqual({ status: "not_found" });
  });

  it("the raw token is never stored, and members cannot read the token hash", async () => {
    const space = await freshSpace("hash@example.com");
    const stored = await db.admin(`select token_hash from couple_invitations where id = $1`, [space.invitationId]);
    expect(stored.rows[0].token_hash).not.toContain(space.token);
    await expectDbError(
      db.query(space.creator, `select token_hash from couple_invitations where id = $1`, [space.invitationId]),
      "permission denied",
    );
    // Knowing the hash does not help: the database hashes whatever it is given.
    await expectDbError(
      db.rpc(await db.createUser("hash@example.com", "Hash"), "accept_couple_invitation", [stored.rows[0].token_hash, null]),
      "invitation_not_found",
    );
  });

  it("requires a confirmed email", async () => {
    const space = await freshSpace("unconfirmed@example.com");
    const user = await db.createUser("unconfirmed@example.com", "Un", { confirmed: false });
    await expectDbError(db.rpc(user, "accept_couple_invitation", [space.token, null]), "email_not_confirmed");
  });

  it("is case-insensitive on email but still bound to it", async () => {
    const space = await freshSpace("Case@Example.com");
    const user = await db.createUser("case@example.com", "Case");
    const result = await db.rpc<{ couple_id: string }>(user, "accept_couple_invitation", [space.token, "Case"]);
    expect(result.couple_id).toBe(space.coupleId);
  });

  it("cannot be accepted anonymously, twice by others, or after acceptance", async () => {
    await expectDbError(db.rpc(null, "accept_couple_invitation", ["x".repeat(43), null]), "permission denied");
    const space = await freshSpace("once@example.com");
    const invitee = await db.createUser("once@example.com", "Once");
    await db.rpc(invitee, "accept_couple_invitation", [space.token, null]);
    // Double submit by the same person is harmless.
    await db.rpc(invitee, "accept_couple_invitation", [space.token, null]);
    expect(await db.rpc(null, "get_invitation_preview", [space.token])).toMatchObject({ status: "accepted" });
  });

  it("expires", async () => {
    const space = await freshSpace("late@example.com");
    await db.admin(`update couple_invitations set expires_at = now() - interval '1 minute' where id = $1`, [space.invitationId]);
    expect(await db.rpc(null, "get_invitation_preview", [space.token])).toMatchObject({ status: "expired", inviter_name: "Creator" });
    const user = await db.createUser("late@example.com", "Late");
    await expectDbError(db.rpc(user, "accept_couple_invitation", [space.token, null]), "invitation_expired");
  });

  it("can be cancelled, which invalidates the link", async () => {
    const space = await freshSpace("cancel@example.com");
    await db.rpc(space.creator, "cancel_couple_invitation", [space.invitationId]);
    expect(await db.rpc(null, "get_invitation_preview", [space.token])).toMatchObject({ status: "cancelled" });
    const user = await db.createUser("cancel@example.com", "Cancel");
    await expectDbError(db.rpc(user, "accept_couple_invitation", [space.token, null]), "invitation_cancelled");
  });

  it("resend rotates the token, renews expiry and is rate limited", async () => {
    const space = await freshSpace("resend@example.com");
    await expectDbError(
      db.rpc(space.creator, "resend_couple_invitation", [space.invitationId, generateInvitationToken().tokenHash, 7]),
      "resend_too_soon",
    );

    for (let i = 0; i < 4; i++) {
      await db.admin(`update couple_invitations set last_sent_at = now() - interval '2 minutes' where id = $1`, [space.invitationId]);
      const next = generateInvitationToken();
      await db.rpc(space.creator, "resend_couple_invitation", [space.invitationId, next.tokenHash, 7]);
      if (i === 0) {
        expect(await db.rpc(null, "get_invitation_preview", [space.token])).toEqual({ status: "not_found" });
        expect(await db.rpc(null, "get_invitation_preview", [next.token])).toMatchObject({ status: "valid" });
      }
    }
    // 1 original send + 4 resends = 5 sends in the window.
    await db.admin(`update couple_invitations set last_sent_at = now() - interval '2 minutes' where id = $1`, [space.invitationId]);
    await expectDbError(
      db.rpc(space.creator, "resend_couple_invitation", [space.invitationId, generateInvitationToken().tokenHash, 7]),
      "resend_limit_reached",
    );
  });

  it("only members of the couple can resend, cancel or re-invite", async () => {
    const space = await freshSpace("guarded@example.com");
    await expectDbError(
      db.rpc(B.a, "resend_couple_invitation", [space.invitationId, generateInvitationToken().tokenHash, 7]),
      "invitation_not_found",
    );
    await expectDbError(db.rpc(B.a, "cancel_couple_invitation", [space.invitationId]), "invitation_not_found");
    await expectDbError(
      db.rpc(B.a, "create_couple_invitation", [space.coupleId, "evil@example.com", generateInvitationToken().tokenHash, 7]),
      "couple_not_found",
    );
    const visible = await db.query(B.a, `select id from couple_invitations where id = $1`, [space.invitationId]);
    expect(visible.rowCount).toBe(0);
  });

  it("re-inviting a different email cancels the previous invitation", async () => {
    const space = await freshSpace("first@example.com");
    const next = generateInvitationToken();
    await db.rpc(space.creator, "create_couple_invitation", [space.coupleId, "second@example.com", next.tokenHash, 7]);
    expect(await db.rpc(null, "get_invitation_preview", [space.token])).toMatchObject({ status: "cancelled" });
    expect(await db.rpc(null, "get_invitation_preview", [next.token])).toMatchObject({ status: "valid" });
  });

  it("a couple never gets a third member", async () => {
    // A stray open invitation on a full couple (e.g. created before it filled up).
    const stray = generateInvitationToken();
    await db.admin(
      `insert into couple_invitations (couple_id, invited_email, invited_by, token_hash, expires_at)
       values ($1, 'third@example.com', $2, $3, now() + interval '7 days')`,
      [A.coupleId, A.a.id, stray.tokenHash],
    );
    expect(await db.rpc(null, "get_invitation_preview", [stray.token])).toMatchObject({ status: "full" });
    const third = await db.createUser("third@example.com", "Third");
    await expectDbError(db.rpc(third, "accept_couple_invitation", [stray.token, null]), "couple_full");

    await expectDbError(
      db.rpc(A.a, "create_couple_invitation", [A.coupleId, "fourth@example.com", generateInvitationToken().tokenHash, 7]),
      "couple_full",
    );
    // Even the service role cannot bypass the trigger.
    await expectDbError(
      db.admin(`insert into couple_members (couple_id, user_id) values ($1, $2)`, [A.coupleId, third.id]),
      "couple_full",
    );
  });

  it("account-state lookup is not callable by clients", async () => {
    await expectDbError(db.rpc(null, "get_auth_account_state", ["maya@example.com"]), "permission denied");
    await expectDbError(db.rpc(A.a, "get_auth_account_state", ["maya@example.com"]), "permission denied");
    const state = await db.admin(`select public.get_auth_account_state('MAYA@example.com') as s`);
    expect(state.rows[0].s).toBe("confirmed");
  });

  it("members cannot add or remove members directly", async () => {
    await expectDbError(
      db.query(A.a, `insert into couple_members (couple_id, user_id) values ($1, $2)`, [A.coupleId, someoneElse.id]),
      "permission denied",
    );
    await expectDbError(db.query(A.a, `delete from couple_members where couple_id = $1`, [A.coupleId]), "permission denied");
  });

  it("rejects self-invites and malformed input", async () => {
    const solo = await db.createUser("solo@example.com", "Solo");
    await expectDbError(
      db.rpc(solo, "create_couple", ["Solo", "SOLO@example.com", generateInvitationToken().tokenHash, null, null, 7]),
      "cannot_invite_self",
    );
    await expectDbError(
      db.rpc(solo, "create_couple", ["Solo", "not-an-email", generateInvitationToken().tokenHash, null, null, 7]),
      "invalid_email",
    );
    await expectDbError(db.rpc(solo, "create_couple", ["Solo", "p@example.com", "raw-token", null, null, 7]), "invalid_token_hash");
  });
});

// ---------------------------------------------------------------------------

describe("storage", () => {
  const insertObject = (user: TestUser, name: string) =>
    db.query(user, `insert into storage.objects (bucket_id, name, owner) values ('couple-media', $1, auth.uid())`, [name]);

  it("members can upload within their tenant prefix", async () => {
    await insertObject(A.a, mediaPath(A.coupleId, "cover"));
    await insertObject(A.a, mediaPath(A.coupleId, "avatars", A.a.id));
    await insertObject(A.b, mediaPath(A.coupleId, "journals", A.journalId));
  });

  it("rejects uploads into another tenant, another user's avatar folder, or another tenant's journal", async () => {
    await expectDbError(insertObject(A.a, mediaPath(B.coupleId, "cover")), "row-level security");
    await expectDbError(insertObject(A.a, mediaPath(B.coupleId, "journals", B.journalId)), "row-level security");
    await expectDbError(insertObject(A.a, mediaPath(A.coupleId, "journals", B.journalId)), "row-level security");
    await expectDbError(insertObject(A.a, mediaPath(A.coupleId, "avatars", A.b.id)), "row-level security");
  });

  it("rejects untrusted names, traversal and disallowed extensions", async () => {
    const bad = [
      `couples/${A.coupleId}/cover/my holiday.jpg`,
      `couples/${A.coupleId}/cover/../../${B.coupleId}/cover/${randomUUID()}.jpg`,
      `couples/${A.coupleId}/journals/${A.journalId}/../${randomUUID()}.jpg`,
      `couples/${A.coupleId}/cover/${randomUUID()}.svg`,
      `couples/${A.coupleId}/cover/${randomUUID()}.jpg.html`,
      `couples/${A.coupleId}/secrets/${randomUUID()}.jpg`,
      `couples/${A.coupleId}/cover/${A.a.id}/${randomUUID()}.jpg`,
      `${A.coupleId}/cover/${randomUUID()}.jpg`,
    ];
    for (const name of bad) {
      await expectDbError(insertObject(A.a, name), "row-level security");
    }
  });

  it("cannot read or delete another tenant's files even with the exact path", async () => {
    const read = await db.query(A.a, `select name from storage.objects where name = $1`, [B.photoPath]);
    expect(read.rowCount).toBe(0);
    const del = await db.query(A.a, `delete from storage.objects where name = $1`, [B.photoPath]);
    expect(del.rowCount).toBe(0);
    const own = await db.query(B.b, `select name from storage.objects where name = $1`, [B.photoPath]);
    expect(own.rowCount).toBe(1);
  });

  it("cannot delete a partner's avatar", async () => {
    const path = mediaPath(A.coupleId, "avatars", A.b.id);
    await insertObject(A.b, path);
    const del = await db.query(A.a, `delete from storage.objects where name = $1`, [path]);
    expect(del.rowCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("couple deletion", () => {
  it("requires the confirmation phrase and membership", async () => {
    await expectDbError(db.rpc(C.a, "delete_couple", [D.coupleId, "yes"]), "confirmation_mismatch");
    await expectDbError(db.rpc(A.a, "delete_couple", [D.coupleId, "DELETE OUR SPACE"]), "couple_not_found");
  });

  it("soft-deletes the tenant: content and files become unreachable, other spaces are untouched", async () => {
    const photo = mediaPath(D.coupleId, "journals", D.journalId);
    await insertObject(photo);
    await db.rpc(C.a, "delete_couple", [D.coupleId, "DELETE OUR SPACE"]);

    expect((await db.query(C.a, `select * from couples where id = $1`, [D.coupleId])).rowCount).toBe(0);
    expect((await db.query(C.a, `select * from journals where couple_id = $1`, [D.coupleId])).rowCount).toBe(0);
    expect((await db.query(C.a, `select * from storage.objects where name = $1`, [photo])).rowCount).toBe(0);

    // David's other space is unaffected, and nothing was hard-deleted.
    expect((await db.query(C.a, `select * from journals where couple_id = $1`, [C.coupleId])).rowCount).toBe(1);
    expect((await db.admin(`select * from journals where id = $1`, [D.journalId])).rowCount).toBe(1);
  });

  async function insertObject(name: string) {
    await db.query(C.a, `insert into storage.objects (bucket_id, name, owner) values ('couple-media', $1, auth.uid())`, [name]);
  }
});

describe("journal deletion", () => {
  it("cascades to photos, reflections and place links only", async () => {
    await db.query(B.b, `delete from journals where id = $1`, [B.journalId]);
    const leftovers = await db.admin(
      `select
         (select count(*) from journal_photos where journal_id = $1)      as photos,
         (select count(*) from journal_reflections where journal_id = $1) as reflections,
         (select count(*) from place_journals where journal_id = $1)      as links,
         (select count(*) from places where id = $2)                      as places,
         (select count(*) from events where id = $3)                      as events,
         (select count(*) from milestones where id = $4)                  as milestones,
         (select count(*) from couples where id = $5)                     as couples,
         (select count(*) from profiles where id = $6)                    as profiles`,
      [B.journalId, B.placeId, B.eventId, B.milestoneId, B.coupleId, B.a.id],
    );
    expect(leftovers.rows[0]).toEqual({
      photos: "0",
      reflections: "0",
      links: "0",
      places: "1",
      events: "1",
      milestones: "1",
      couples: "1",
      profiles: "1",
    });
  });
});
