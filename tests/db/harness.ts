import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client, type QueryResult, type QueryResultRow } from "pg";

/**
 * Test harness for database-level security tests.
 *
 * Creates a disposable database, loads a small Supabase shim (roles, auth.uid,
 * storage tables) plus the real migration files, and lets tests run SQL as a
 * specific authenticated user, exactly the way PostgREST does it:
 *
 *   set local role authenticated;
 *   set local request.jwt.claims = '{"sub": "<user id>", "role": "authenticated"}';
 */

const ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

export const ADMIN_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";

type Params = unknown[];

export type Query = <R extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: Params,
) => Promise<QueryResult<R>>;

export type TestUser = { id: string; email: string; name: string };

export class TestDatabase {
  private constructor(
    private readonly client: Client,
    private readonly name: string,
  ) {}

  static async create(): Promise<TestDatabase> {
    const name = `our_story_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
    await admin.connect();
    await admin.query(`create database ${name}`);
    await admin.end();

    const url = new URL(ADMIN_DATABASE_URL);
    url.pathname = `/${name}`;
    const client = new Client({ connectionString: url.toString() });
    await client.connect();
    // Roles are cluster-wide; the shim creates them only if missing.
    await client.query(
      readFileSync(join(__dirname, "supabase-shim.sql"), "utf8").replace(
        /create role (\w+) ([^;]+);/g,
        (_m, role: string, rest: string) =>
          `do $$ begin if not exists (select 1 from pg_roles where rolname = '${role}') then create role ${role} ${rest}; end if; end $$;`,
      ),
    );

    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }

    return new TestDatabase(client, name);
  }

  async destroy(): Promise<void> {
    await this.client.end();
    const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${this.name} with (force)`);
    await admin.end();
  }

  /** Superuser access, bypasses RLS. For fixtures and assertions only. */
  admin: Query = (sql, params) => this.client.query(sql, params);

  async createUser(
    email: string,
    name: string,
    { confirmed = true }: { confirmed?: boolean } = {},
  ): Promise<TestUser> {
    const { rows } = await this.admin<{ id: string }>(
      `insert into auth.users (email, email_confirmed_at, raw_user_meta_data)
       values ($1, case when $2 then now() end, jsonb_build_object('display_name', $3::text))
       returning id`,
      [email, confirmed, name],
    );
    return { id: rows[0].id, email, name };
  }

  /** Run fn inside a transaction as the given user (null = anon). Commits on success. */
  async as<T>(user: TestUser | null, fn: (q: Query) => Promise<T>): Promise<T> {
    await this.client.query("begin");
    try {
      if (user) {
        await this.client.query("set local role authenticated");
        await this.client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" }),
        ]);
      } else {
        await this.client.query("set local role anon");
        await this.client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: "anon" }),
        ]);
      }
      const result = await fn(this.admin);
      await this.client.query("commit");
      return result;
    } catch (error) {
      await this.client.query("rollback");
      throw error;
    }
  }

  /** Convenience: single statement as a user. */
  query<R extends QueryResultRow = QueryResultRow>(
    user: TestUser | null,
    sql: string,
    params?: Params,
  ): Promise<QueryResult<R>> {
    return this.as(user, (q) => q<R>(sql, params));
  }

  /** Call an RPC as a user and return its single value. */
  async rpc<T = unknown>(user: TestUser | null, fn: string, args: Params): Promise<T> {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await this.query<{ result: T }>(user, `select public.${fn}(${placeholders}) as result`, args);
    return rows[0].result;
  }
}

/** Expect a database error whose message or SQLSTATE matches. */
export async function expectDbError(promise: Promise<unknown>, match: string | RegExp): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const e = error as { message?: string; code?: string };
    const text = `${e.code ?? ""} ${e.message ?? ""}`;
    const ok = typeof match === "string" ? text.includes(match) : match.test(text);
    if (!ok) {
      throw new Error(`Expected database error matching ${String(match)}, got: ${text}`);
    }
    return;
  }
  throw new Error(`Expected database error matching ${String(match)}, but the statement succeeded`);
}
