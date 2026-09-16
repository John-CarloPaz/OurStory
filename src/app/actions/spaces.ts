"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setActiveCoupleCookie } from "@/lib/cookies";
import { describeError } from "@/lib/errors";
import { formError, formSuccess, parseForm, type FormState } from "@/lib/forms";
import { createSpaceWithInvitation } from "@/lib/invitations/service";
import { ACTIVE_COUPLE_COOKIE } from "@/lib/redirects";
import { getMemberships, requireAccount, requireActiveSpace } from "@/lib/tenant";
import { coupleIdentitySchema, createSpaceSchema, deleteSpaceSchema, profileSchema, themeSchema, uuid } from "@/lib/validation";
import type { InvitationFormState } from "./invitations";

export async function createSpace(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const parsed = parseForm(createSpaceSchema, formData);
  if (!parsed.ok) return parsed.state;

  const session = await requireAccount("/onboarding");
  const result = await createSpaceWithInvitation(session, parsed.data);
  if (!result.ok) return formError(result.error);

  await setActiveCoupleCookie(result.value.coupleId);
  revalidatePath("/", "layout");
  return { status: "success", outcome: result.value };
}

/** Switching spaces only changes a preference; membership is re-checked on every request. */
export async function switchSpace(formData: FormData): Promise<void> {
  const coupleId = uuid.safeParse(formData.get("coupleId"));
  if (coupleId.success) {
    const memberships = await getMemberships();
    if (memberships.some((m) => m.couple_id === coupleId.data)) {
      await setActiveCoupleCookie(coupleId.data);
    }
  }
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function updateCoupleIdentity(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(coupleIdentitySchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { data, error } = await space.supabase
    .from("couples")
    .update({
      name: parsed.data.name,
      display_title: parsed.data.displayTitle,
      description: parsed.data.description,
      story_began_on: parsed.data.storyBeganOn,
    })
    .eq("id", space.coupleId)
    .select("id");
  if (error || data.length === 0) return formError(describeError(error));

  revalidatePath("/", "layout");
  return formSuccess("Saved.");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { data, error } = await space.supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, birthday: parsed.data.birthday })
    .eq("id", space.userId)
    .select("id");
  if (error || data.length === 0) return formError(describeError(error));

  revalidatePath("/", "layout");
  return formSuccess("Saved.");
}

export async function updateTheme(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(themeSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { data, error } = await space.supabase
    .from("couple_themes")
    .update({
      name: parsed.data.name,
      primary_color: parsed.data.primaryColor.toLowerCase(),
      background_color: parsed.data.backgroundColor.toLowerCase(),
      card_style: parsed.data.cardStyle,
      typography: parsed.data.typography,
      background_style: parsed.data.backgroundStyle,
      layout: parsed.data.layout,
    })
    .eq("couple_id", space.coupleId)
    .select("couple_id");
  if (error || data.length === 0) return formError(describeError(error));

  revalidatePath("/", "layout");
  return formSuccess("Your space has a new look.");
}

export async function deleteSpace(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(deleteSpaceSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { error } = await space.supabase.rpc("delete_couple", {
    p_couple_id: space.coupleId,
    p_confirmation: parsed.data.confirmation,
  });
  if (error) return formError(describeError(error));

  (await cookies()).delete(ACTIVE_COUPLE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/home");
}
