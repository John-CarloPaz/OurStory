# Our Story

A private, multi-tenant relationship journal. Two people share one space for their
journals, reflections, photos, plans, milestones, places, notes and letters. One
deployment and one Supabase database serve every couple, and each couple sees
only their own world.

**Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS, Auth,
Storage), Zod, Tailwind CSS 4.

How tenancy, security, invitations, letters and storage work is described in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup

### 1. Create the database

In the Supabase dashboard, open **SQL Editor**, paste all of
[`supabase/schema.sql`](supabase/schema.sql) and run it once. It runs as one
transaction, so if anything fails nothing is applied.

It creates the tables, row level security policies, database functions and the
private `couple-media` storage bucket with its policies.

### 2. Configure Supabase Auth

**Authentication → URL Configuration**

- Redirect URLs: add every address the app runs on, each ending in `/**`, for
  example `http://localhost:3000/**` and `https://<your-app>.vercel.app/**`.
- Site URL: your production URL.

Email links follow the app's `NEXT_PUBLIC_SITE_URL`, but only for addresses in the
Redirect URLs list. Any other address is replaced by the Site URL, which is how
production emails end up linking to localhost.

**Authentication → Sign In / Providers → Email**

- Keep **Confirm email** on.
- Optional: raise **Email OTP Expiration** (up to 86400 seconds) so the sign-in part
  of invitation emails lasts longer. Invitations themselves last 7 days either way.

**Authentication → Emails → Templates** (recommended)

Paste each file's HTML into the matching template. The links are built from
`{{ .RedirectTo }}` (the page the app asked for) rather than the Site URL, so the
same templates work locally and in production. The link is verified on the
server and works on any device:

| Template          | File                                                        | Suggested subject                                     |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Invite user       | [invite.html](supabase/templates/invite.html)               | You've been invited to a private space on Our Story   |
| Magic link        | [magic_link.html](supabase/templates/magic_link.html)       | Your invitation to a private space on Our Story       |
| Confirm signup    | [confirmation.html](supabase/templates/confirmation.html)   | Confirm your email for Our Story                      |
| Reset password    | [recovery.html](supabase/templates/recovery.html)           | Reset your Our Story password                         |

The app also works with Supabase's default templates.

**Authentication → Emails → SMTP settings**

Supabase's built-in email service only delivers to members of your Supabase
organization and is limited to a few emails per hour. That's fine for trying
things out. Before inviting real couples, add your own SMTP credentials (any
provider). The app code doesn't change. When an invitation email can't be sent,
the app shows the inviter a private link they can share themselves.

### 3. Environment

Copy `.env.example` to `.env.local` and fill in your project values:

| Variable                               | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project URL                                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (browser safe)                                   |
| `SUPABASE_SECRET_KEY`                  | Server only; used just to send invitation emails via Supabase Auth |
| `NEXT_PUBLIC_SITE_URL`                 | Public URL used in email links. Read at request time; on Vercel it defaults to the production domain |
| `INVITATION_TTL_DAYS`                  | Invitation lifetime, default 7                                   |
| `INVITATION_EMAIL_DELIVERY`            | `supabase` (default) or `console` for local development          |

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, confirm your email, and create
your space. Your partner receives an invitation, and joining lands them in the
same space.

## Scripts

| Command             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Development server                                                        |
| `npm run build`     | Production build                                                          |
| `npm run lint`      | ESLint                                                                    |
| `npm run typecheck` | TypeScript                                                                |
| `npm test`          | Unit tests                                                                |
| `npm run test:db`   | Tenant isolation, privacy, letters, invitations and storage tests on Postgres |
| `npm run test:live` | End-to-end checks against the Supabase project in `.env.local`, plus rendered pages if the dev server is running. Creates throwaway confirmed users (no emails sent) and deletes everything afterwards |
| `npm run db:bundle` | Rebuild `supabase/schema.sql` from `supabase/migrations`                  |
| `npm run db:types`  | Regenerate `src/lib/database.types.ts` from the migrations                |

### Database tests

`npm run test:db` and `npm run db:types` need a local PostgreSQL (17 recommended)
that they can create and drop databases on. No Docker or Supabase CLI is needed.
A throwaway cluster works well:

```bash
initdb -D ./.pgtest -U postgres --auth=trust
pg_ctl -D ./.pgtest -o "-p 54329" -l ./.pgtest/log start
```

They connect to `postgres://postgres@localhost:54329/postgres` by default; set
`TEST_DATABASE_URL` to use another server. Each run loads the real migration
files into a fresh database (with a small shim for Supabase's `auth` and
`storage` schemas), acts as each test user exactly the way the Supabase API
does, then drops the database.

## Project layout

```
supabase/
  migrations/         schema, RLS, functions, storage (source of truth)
  schema.sql          all migrations bundled, to paste into the SQL editor
  templates/          Supabase Auth email templates
src/
  proxy.ts            session refresh, sign-in redirect, pending invitation cookie
  app/
    (auth)/           login, signup, password reset, account setup
    auth/confirm/     email link landing (verifyOtp / code exchange)
    onboarding/       Create Your Space
    invite/[token]/   invitation acceptance
    (space)/          the couple workspace: home, story, milestones, calendar,
                      memories, letters, places, notes, settings
    actions/          Server Actions (auth, invitations, spaces, content, uploads)
  lib/
    tenant.ts         identity + active couple resolution
    invitations/      token generation, invitation orchestration
    email/            InvitationMailer abstraction and channels
    storage/          path grammar, signed URLs
    supabase/         server, browser and (restricted) admin clients
    theme.ts          couple theme → CSS variables
    validation.ts     Zod schemas
tests/
  unit/               pure logic
  db/                 RLS and invitation tests against Postgres
```
