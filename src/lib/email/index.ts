import "server-only";
import { serverEnv } from "@/lib/server-env";
import { ConsoleInvitationMailer } from "./console-mailer";
import { SupabaseAuthInvitationMailer } from "./supabase-auth-mailer";
import type { InvitationMailer } from "./types";

export type { DeliveryResult, InvitationEmail, InvitationMailer } from "./types";

export function getInvitationMailer(): InvitationMailer {
  switch (serverEnv.invitationDelivery) {
    case "console":
      return new ConsoleInvitationMailer();
    case "supabase":
    default:
      return new SupabaseAuthInvitationMailer();
  }
}
