import { describe, expect, it } from "vitest";
import { generateInvitationToken, hashInvitationToken, isWellFormedInvitationToken } from "@/lib/invitations/token";
import { safeRedirectPath } from "@/lib/redirects";
import { buildMediaPath, contentTypeForPath, isMediaPathFor } from "@/lib/storage/paths";

const COUPLE = "11111111-1111-4111-8111-111111111111";
const OTHER_COUPLE = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const JOURNAL = "44444444-4444-4444-8444-444444444444";

describe("invitation tokens", () => {
  it("are 256-bit, url-safe and unique", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateInvitationToken().token));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(isWellFormedInvitationToken(token)).toBe(true);
  });

  it("store only a SHA-256 hex digest that matches Postgres encode(sha256(...), 'hex')", () => {
    const { token, tokenHash } = generateInvitationToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
    // Known vector: sha256("abc")
    expect(hashInvitationToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("rejects malformed tokens before any lookup", () => {
    for (const bad of ["", "short", "a".repeat(44), `${"a".repeat(42)}/`, `${"a".repeat(42)}.`, null, 42]) {
      expect(isWellFormedInvitationToken(bad)).toBe(false);
    }
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/invite/abc")).toBe("/invite/abc");
    expect(safeRedirectPath("/story?x=1")).toBe("/story?x=1");
    expect(safeRedirectPath("http://localhost:3000/home")).toBe("/home");
  });

  it("rejects open redirects", () => {
    for (const bad of ["https://evil.example/", "//evil.example/x", "/\\evil.example", "javascript:alert(1)", "http://localhost:3001/home"]) {
      expect(safeRedirectPath(bad, "/fallback")).toBe("/fallback");
    }
  });

  it("unwraps a nested /auth/confirm redirect", () => {
    expect(safeRedirectPath("http://localhost:3000/auth/confirm?next=%2Finvite%2Fxyz")).toBe("/invite/xyz");
    expect(safeRedirectPath("/auth/confirm?next=https://evil.example", "/home")).toBe("/home");
  });
});

describe("storage paths", () => {
  it("are generated inside the tenant's own folder with server-chosen names", () => {
    const cover = buildMediaPath({ kind: "cover", coupleId: COUPLE }, "image/jpeg");
    expect(cover).toMatch(new RegExp(`^couples/${COUPLE}/cover/[0-9a-f-]{36}\\.jpg$`));
    const avatar = buildMediaPath({ kind: "avatar", coupleId: COUPLE, userId: USER }, "image/webp");
    expect(avatar).toMatch(new RegExp(`^couples/${COUPLE}/avatars/${USER}/[0-9a-f-]{36}\\.webp$`));
    const photo = buildMediaPath({ kind: "journal_photo", coupleId: COUPLE, journalId: JOURNAL }, "image/png");
    expect(isMediaPathFor(photo, { kind: "journal_photo", coupleId: COUPLE, journalId: JOURNAL })).toBe(true);
    expect(contentTypeForPath(photo)).toBe("image/png");
  });

  it("reject paths outside the expected folder", () => {
    const target = { kind: "journal_photo", coupleId: COUPLE, journalId: JOURNAL } as const;
    const file = "55555555-5555-4555-8555-555555555555.jpg";
    const bad = [
      `couples/${OTHER_COUPLE}/journals/${JOURNAL}/${file}`,
      `couples/${COUPLE}/journals/${JOURNAL}/../../${OTHER_COUPLE}/cover/${file}`,
      `couples/${COUPLE}/journals/${JOURNAL}/nested/${file}`,
      `couples/${COUPLE}/journals/${JOURNAL}/holiday.jpg`,
      `couples/${COUPLE}/journals/${JOURNAL}/${file}.svg`,
      `couples/${COUPLE}/cover/${file}`,
    ];
    for (const path of bad) expect(isMediaPathFor(path, target), path).toBe(false);
  });
});
