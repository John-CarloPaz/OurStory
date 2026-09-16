import "server-only";

export type InvitationDelivery = "supabase" | "console";

function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export const serverEnv = {
  /** Only read by src/lib/supabase/admin.ts. */
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  /** Default 7 days; the database clamps to 1–30. */
  invitationTtlDays: positiveInt(process.env.INVITATION_TTL_DAYS, 7, 30),
  /** How invitation emails are delivered. See src/lib/email. */
  invitationDelivery: (process.env.INVITATION_EMAIL_DELIVERY === "console" ? "console" : "supabase") as InvitationDelivery,
};
