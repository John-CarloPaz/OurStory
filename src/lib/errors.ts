/**
 * Maps machine-readable error codes raised by the database (see
 * supabase/migrations/*_functions.sql) and Supabase Auth to user-facing copy.
 * Unknown errors never leak internals.
 */

const MESSAGES: Record<string, string> = {
  not_authenticated: "Please sign in to continue.",
  invalid_name: "Please enter a name between 1 and 60 characters.",
  invalid_couple_name: "Relationship names can be up to 80 characters.",
  invalid_email: "Please enter a valid email address.",
  cannot_invite_self: "You can't invite yourself. Enter your partner's email.",
  cannot_invite_member: "That person is already in this space.",
  membership_limit_reached: "You've reached the maximum number of spaces for one account.",
  rate_limited: "That's a lot of invitations in a short time. Please try again tomorrow.",
  invalid_token_hash: "Something went wrong creating the invitation. Please try again.",

  invitation_not_found: "This invitation is no longer valid.",
  invitation_cancelled: "This invitation is no longer valid.",
  invitation_expired: "This invitation has expired.",
  invitation_already_accepted: "This invitation has already been used.",
  invitation_email_mismatch: "This invitation was sent to a different email address.",
  email_not_confirmed: "Please confirm your email address first, then open the invitation again.",
  couple_full: "This space already has two members.",
  couple_unavailable: "This space is no longer available.",
  couple_not_found: "We couldn't find that space.",
  resend_too_soon: "The invitation was just sent. Please wait a minute before resending.",
  resend_limit_reached: "You've resent this invitation several times today. Please try again tomorrow.",

  confirmation_mismatch: "Type the confirmation phrase exactly as shown.",
  partner_not_joined: "Letters can be written once your partner has joined.",
  letter_not_editable: "This letter can no longer be edited.",
  invalid_unlock_at: "Please choose when the letter opens.",
  immutable_column: "That change isn't allowed.",
};

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match.",
  email_not_confirmed: "Please confirm your email address before signing in.",
  user_already_exists: "An account with this email already exists. Try signing in.",
  email_exists: "An account with this email already exists. Try signing in.",
  weak_password: "Please choose a stronger password (at least 8 characters).",
  over_email_send_rate_limit: "Too many emails were sent recently. Please wait a little and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
  same_password: "Choose a password different from your current one.",
  otp_expired: "That link has expired. Please request a new one.",
};

export const GENERIC_ERROR = "Something went wrong. Please try again.";

type ErrorLike = { message?: string; code?: string; hint?: string | null } | null | undefined;

export function errorCode(error: ErrorLike): string | undefined {
  if (!error) return undefined;
  if (error.message && MESSAGES[error.message]) return error.message;
  if (error.code && AUTH_MESSAGES[error.code]) return error.code;
  return undefined;
}

export function describeError(error: ErrorLike, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  if (error.message && MESSAGES[error.message]) return MESSAGES[error.message];
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  // Postgres constraint / RLS failures: do not echo internals.
  if (error.code === "23514") return "Some of the details aren't valid. Please check and try again.";
  if (error.code === "42501" || error.code === "23503") return "You don't have access to that.";
  return fallback;
}

export function describeCode(code: string): string {
  return MESSAGES[code] ?? GENERIC_ERROR;
}
