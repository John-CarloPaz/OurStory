import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation tokens.
 *
 * - 32 bytes from the OS CSPRNG, base64url encoded (43 chars, 256 bits).
 * - Only the SHA-256 hex digest is stored (couple_invitations.token_hash).
 * - The raw token exists only in the invitation link. The database hashes the
 *   token it receives with the same algorithm (private.hash_invitation_token),
 *   so a leaked hash cannot be replayed as a token.
 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type GeneratedInvitationToken = {
  token: string;
  tokenHash: string;
};

export function generateInvitationToken(): GeneratedInvitationToken {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedInvitationToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}
