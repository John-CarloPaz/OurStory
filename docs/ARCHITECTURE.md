# Architecture

Our Story is one Next.js deployment and one Supabase database serving many
couples. Each couple is a **tenant**: a completely private workspace.

```
Next.js app ── Supabase Auth ── authenticated user
                                      │
                               couple_members          (a user may belong to many couples)
                                      │
                     ┌────────────────┴────────────────┐
                 couple A                           couple B
             journals, photos,                  journals, photos,
             events, letters…                   events, letters…
                     │                                 │
                  RLS + private storage prefix per couple
```

| Boundary        | Mechanism                                                        |
| --------------- | ---------------------------------------------------------------- |
| Tenant          | `couple_id` on every tenant-owned row                            |
| Security        | Postgres Row Level Security keyed on `couple_members`            |
| Invitation      | Email-bound, single-use, expiring token (only its hash is stored) |
| User experience | The active couple workspace (a preference, never an authorization) |

## Data model

`supabase/migrations/` is the source of truth. `supabase/schema.sql` is the same
SQL bundled into one file (`npm run db:bundle`).

- **`couples`** is the tenant root. It has a unique `slug` reserved for future
  tenant URLs; the slug is presentation only and is never used for authorization.
  Couples are soft-deleted (`deleted_at`).
- **`couple_members`** links users to couples (primary key `(couple_id, user_id)`).
  Nothing assumes one couple per user. A trigger caps each couple at two members,
  locking the couple row so concurrent acceptances can't race past the limit.
- **`couple_invitations`** holds `token_hash` (SHA-256), `expires_at`, the
  outcome columns and resend rate-limit counters. At most one open invitation
  exists per couple.
- **Tenant-owned tables** all carry `couple_id NOT NULL`: `couple_themes`,
  `journals`, `journal_reflections`, `journal_photos`, `events`, `milestones`,
  `places`, `place_journals`, `notes`, `letters`, `letter_contents`.
- **`profiles`** is user-owned (not a tenant table).

### Integrity rules that hold even without RLS

- **Composite foreign keys** on every child row: `(journal_id, couple_id)` →
  `journals(id, couple_id)`, and the same for places and letters. A row in
  couple A can never point at a parent in couple B.
- **Member foreign keys**: `(couple_id, author_id)` → `couple_members`. A letter
  can only be addressed to someone in the same couple.
- **Immutable columns**: a trigger rejects changes to `couple_id` and authorship
  columns, so rows can't be moved between tenants.
- **Storage path checks**: `journal_photos.storage_path`, `couples.cover_path` and
  `couple_members.avatar_path` must live under the row's own `couples/{couple_id}/…`
  prefix.

## Data ownership

| Kind                   | Tables / content                                           | Who can read                   | Who can write                   |
| ---------------------- | ---------------------------------------------------------- | ------------------------------ | ------------------------------- |
| Couple-owned           | couple profile, theme, journals, photos, events, milestones, places | both members         | both members                    |
| User-owned             | profile, private reflections, private notes, authored letters | the owner (letters: see below) | the owner                     |
| Relationship-controlled | shared reflections, shared notes, couple settings         | both members                   | the author (settings: both)     |

## Security model

### 1. Row Level Security (the enforcement layer)

Every policy is built on one helper:

```sql
private.is_couple_member(couple_id)
  -- exists (select 1 from couple_members cm join couples c ...
  --         where cm.couple_id = $1 and cm.user_id = auth.uid() and c.deleted_at is null)
```

It is `SECURITY DEFINER`, so it can read `couple_members` without recursing
through that table's own policy. It lives in the `private` schema, which the
Data API doesn't expose.

- Couple-owned tables: member → select/insert/update/delete.
- Reflections and notes: member **and** (author **or** `visibility = 'shared'`)
  to read; author only to write.
- Letters: see below.
- `anon` has no table privileges at all. Its only entry point is
  `get_invitation_preview(token)`.
- Privileges are granted explicitly per table (and per column where it matters:
  `couples`, `couple_members`, `couple_themes`, and `couple_invitations`, whose
  `token_hash` is not readable) rather than relying on Supabase defaults.

### 2. Server Actions (defense in depth)

Every action in `src/app/actions/` follows the same steps:

1. Authenticate: `requireActiveSpace()` / `requireSession()` verify the Supabase JWT.
2. Resolve the tenant from **membership** (`getActiveSpace`) or from the
   **resource itself** (read the journal through RLS and use its `couple_id`).
3. Validate input with Zod (`src/lib/validation.ts`). No schema accepts `couple_id`.
4. Run the query as the user, so RLS applies.
5. Return a safe message (`src/lib/errors.ts` maps database codes to copy).

A tampered id from another tenant simply matches zero rows.

### 3. The service-role key

`src/lib/supabase/admin.ts` is the only place the secret key is used, and it has
exactly two jobs: sending invitation emails through Supabase Auth, and calling
`get_auth_account_state()` (executable by `service_role` only). It is never used
to read or write couple content.

## Active couple context

`getActiveSpace()` loads the user's memberships through RLS. An `os_active_couple`
cookie picks which one is shown when there are several. A cookie value that isn't
one of your memberships is ignored. Routes are tenant-free (`/home`, `/story`,
`/calendar`, `/memories`, `/letters`, `/places`, `/notes`, `/milestones`, `/settings`),
and the header menu switches spaces.

## Invitations

```
create_couple / create_couple_invitation / resend_couple_invitation
   app: token = 32 random bytes (base64url); hash = sha256(token)
   db:  stores hash, expires_at (default 7 days, INVITATION_TTL_DAYS)
   app: emails https://site/invite/<token>

/invite/<token>
   get_invitation_preview(token)      db hashes the token, returns status + inviter name
   accept_couple_invitation(token)    db re-validates everything, row-locked:
       exists · not cancelled · not accepted · not expired · couple live
       · caller's confirmed email == invited_email · couple has < 2 members
```

- **Single use:** `accepted_at` is set in the same transaction as the membership insert.
- **Resend** rotates the hash (the old link dies) and renews the expiry. It is
  rate-limited in the database: 60 seconds between sends, at most 5 sends per 24 hours.
- **Cancel** sets `cancelled_at`, and the link shows "This invitation is no longer valid."
- **Email binding:** a signed-in user whose confirmed email differs from the
  invitation cannot accept it.
- **Surviving email verification:** the proxy stores the token in an
  `os_pending_invite` cookie, sign-up confirmation links carry `next=/invite/<token>`,
  and `/auth/confirm` falls back to the cookie. After Supabase verifies the email,
  `/auth/confirm` sets a 5-minute `os_auto_join` cookie bound to that token, so the
  invitation page joins without an extra click.

### Acceptance paths

| Visitor                                             | What they see                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Signed out                                          | "You're invited." with **Create Account** and **I already have an account** |
| Signed out, creates account (new email)             | `signUp` → confirm email → back to the invitation → joined → `/home`                                            |
| Signed out, email has an unverified account         | A fresh verification link is sent; the password is set after verification (never before)                        |
| Arrived from the Supabase invite email (new account) | Signed in via the link → "Create your account" (name + password) → joined → `/home`                             |
| Signed in with the invited email                    | "Welcome back. You've been invited to join … [Join Space]"                                                      |
| Signed in with a different email                    | Explained, with "Sign out and switch account"                                                                   |

## Email delivery

`src/lib/email/` defines `InvitationMailer`. Business logic only calls
`getInvitationMailer().sendInvitation(...)`.

- `supabase-auth-mailer.ts` (default) uses Supabase Auth's own emails: `inviteUserByEmail`
  for new or unverified addresses (the "Invite user" template, with the inviter's
  name passed as template data) and `signInWithOtp` for existing accounts (the
  "Magic link" template). No third-party provider.
- `console-mailer.ts` (`INVITATION_EMAIL_DELIVERY=console`) prints the invitation for development.
- Whenever delivery fails, the inviter is shown the private link to share
  themselves. It still only works for the invited email.

To add Resend, Postmark, SES or SMTP later, implement `InvitationMailer` with
`renderInvitationEmail()` and register it in `src/lib/email/index.ts`.

## Letters

The envelope (`letters`: author, recipient, title, `unlock_at`) is readable by
author and recipient. The words live in `letter_contents`, whose select policy
allows the author always and the recipient only when `unlock_at <= now()`,
evaluated against the **database** clock. Hiding the content in React is not
what protects it: a sealed letter's content is never returned to the recipient
by the API. Only the author may edit, and only while sealed. The recipient is
derived from membership inside `create_letter`, never taken from the client.

## Storage

One private bucket, `couple-media` (15 MB; JPEG/PNG/WebP/GIF/AVIF; no SVG).

```
couples/{couple_id}/cover/{uuid}.{ext}
couples/{couple_id}/avatars/{user_id}/{uuid}.{ext}
couples/{couple_id}/journals/{journal_id}/{uuid}.{ext}
```

Storage policies parse the object name with an exact grammar
(`private.parse_media_path`). Anything else, including user file names,
`..`, extra segments or other extensions, is rejected, and membership of the
couple in the path is re-checked. Avatars are writable only by their owner.
Journal uploads require the journal to belong to that couple.

Uploads are signed by the server (it generates the path) and sent straight from
the browser to Storage, then recorded by `completeUpload`, which re-derives the
expected folder and confirms the object exists. Images are displayed through
short-lived signed URLs created as the viewer.

## Deletion

- **Journal:** cascades to its photos, reflections and place links (storage
  objects are removed by the action). Events, milestones, places, profiles and
  the couple are untouched.
- **Place:** cascades to its journal links; events keep existing, with `place_id` cleared.
- **Couple:** `delete_couple(couple_id, 'DELETE OUR SPACE')` soft-deletes. Every
  helper treats a deleted couple as having no members, so all content and files
  become unreachable at once. A hard purge is deliberately left as a separate
  offline administrative task.

There is no platform-admin read access to couple content.

## Adding a new tenant-owned table

1. Add `couple_id uuid not null references couples(id) on delete cascade`.
2. Use composite foreign keys for parents inside the tenant, and member foreign keys for authors.
3. Add the `guard_immutable_columns('couple_id', …)` trigger.
4. Enable RLS, `revoke all … from anon, authenticated`, grant exactly what's needed.
5. Write policies with `private.is_couple_member(couple_id)`.
6. Add the table to `TENANT_TABLES` in `tests/db/tenant-isolation.test.ts`.
7. Run `npm run db:bundle && npm run db:types`.

## Tests

- `npm test`: unit tests for tokens, redirect safety, storage paths, time zones,
  theme contrast and validation.
- `npm run test:db`: runs the real migrations against a disposable Postgres
  database (with a small Supabase shim for roles, `auth.uid()` and storage
  tables) and exercises RLS as each fictional user: Alex + Maya, John + Sarah,
  David + Emma, and the John + Kath journey. Each run creates and drops its own
  database.
