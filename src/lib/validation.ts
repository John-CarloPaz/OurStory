import { z } from "zod";
import { CARD_STYLES, BACKGROUND_STYLES, LAYOUTS, THEME_PRESET_NAMES, TYPOGRAPHY_OPTIONS } from "@/lib/theme";
import { IMAGE_CONTENT_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage/paths";

/**
 * Input validation for every Server Action. The database re-validates with
 * CHECK constraints, so these schemas exist for good error messages and to
 * reject garbage early — not as the security boundary.
 *
 * Note what is NOT in any schema: couple_id. The tenant is always resolved on
 * the server from the signed-in user's membership or the resource itself.
 */

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} can be up to ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be up to ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Please choose a valid date.");

const optionalDate = z
  .union([z.literal(""), isoDate])
  .optional()
  .transform((v) => (v ? v : null));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please choose a time.");

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined()])
  .transform((v) => v === "on" || v === "true");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address.").max(254));

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords can be up to 72 characters.");

export const uuid = z.uuid();

// Auth ------------------------------------------------------------------------

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  displayName: requiredText("Your name", 60),
  email: emailSchema,
  password,
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z.object({ password, next: z.string().optional() });

export const accountSetupSchema = z.object({
  displayName: requiredText("Your name", 60),
  password,
  next: z.string().optional(),
});

// Onboarding & invitations -------------------------------------------------------

export const createSpaceSchema = z.object({
  creatorName: requiredText("Your name", 60),
  partnerEmail: emailSchema,
  coupleName: optionalText("Relationship name", 80),
  storyBeganOn: optionalDate,
});

export const invitePartnerSchema = z.object({ email: emailSchema });

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const invitedSignUpSchema = z.object({
  token: invitationTokenSchema,
  displayName: requiredText("Your name", 60),
  password,
});

export const invitedAccountSetupSchema = invitedSignUpSchema;

// Couple settings ------------------------------------------------------------------

export const coupleIdentitySchema = z.object({
  name: optionalText("Couple name", 80),
  displayTitle: requiredText("Display title", 80),
  description: optionalText("Description", 500),
  storyBeganOn: optionalDate,
});

export const profileSchema = z.object({
  displayName: requiredText("Name", 60),
  birthday: optionalDate,
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a color.");

export const themeSchema = z.object({
  name: z.enum(THEME_PRESET_NAMES),
  primaryColor: hexColor,
  backgroundColor: hexColor,
  cardStyle: z.enum(CARD_STYLES),
  typography: z.enum(TYPOGRAPHY_OPTIONS),
  backgroundStyle: z.enum(BACKGROUND_STYLES),
  layout: z.enum(LAYOUTS),
});

export const deleteSpaceSchema = z.object({ confirmation: z.string() });

// Content --------------------------------------------------------------------------

export const journalSchema = z.object({
  title: requiredText("Title", 160),
  entryDate: isoDate,
  mood: optionalText("Mood", 40),
  body: optionalText("Story", 50000),
  "placeIds[]": z.union([z.array(uuid), uuid.transform((v) => [v])]).optional().default([]),
});

export const reflectionSchema = z.object({
  journalId: uuid,
  body: requiredText("Reflection", 20000),
  visibility: z.enum(["private", "shared"]),
});

export const photoCaptionSchema = z.object({
  photoId: uuid,
  caption: optionalText("Caption", 500),
});

export const eventSchema = z
  .object({
    title: requiredText("Title", 160),
    date: isoDate,
    allDay: checkbox,
    startTime: z.union([z.literal(""), time]).optional(),
    endTime: z.union([z.literal(""), time]).optional(),
    location: optionalText("Location", 200),
    description: optionalText("Details", 5000),
    placeId: z.union([z.literal(""), uuid]).optional().transform((v) => (v ? v : null)),
  })
  .refine((v) => v.allDay || Boolean(v.startTime), { path: ["startTime"], message: "Choose a start time or mark it all day." })
  .refine((v) => v.allDay || !v.endTime || !v.startTime || v.endTime >= v.startTime, {
    path: ["endTime"],
    message: "The end time must be after the start time.",
  });

export const MILESTONE_ICONS = ["heart", "star", "home", "ring", "plane", "gift", "sparkles", "flag"] as const;

export const milestoneSchema = z.object({
  title: requiredText("Title", 160),
  occurredOn: isoDate,
  icon: z.enum(MILESTONE_ICONS),
  description: optionalText("Description", 5000),
});

export const PLACE_CATEGORIES = ["home", "food", "travel", "nature", "culture", "nightlife", "other"] as const;

export const placeSchema = z.object({
  name: requiredText("Name", 160),
  category: z.enum(PLACE_CATEGORIES),
  status: z.enum(["visited", "wishlist"]),
  address: optionalText("Address", 300),
  firstVisitedOn: optionalDate,
  description: optionalText("Description", 5000),
});

export const noteSchema = z.object({
  title: optionalText("Title", 160),
  body: requiredText("Note", 20000),
  visibility: z.enum(["private", "shared"]),
  pinned: checkbox,
});

export const letterSchema = z.object({
  title: requiredText("Envelope", 160),
  content: requiredText("Letter", 50000),
  unlockDate: isoDate,
  unlockTime: time,
});

// Uploads --------------------------------------------------------------------------

export const uploadTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cover") }),
  z.object({ kind: z.literal("avatar") }),
  z.object({ kind: z.literal("journal_photo"), journalId: uuid }),
]);

const dimension = z.number().int().min(1).max(20000);

export const prepareUploadSchema = z.object({
  target: uploadTargetSchema,
  contentType: z.enum(IMAGE_CONTENT_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Images can be up to 15 MB."),
  /** A browser-generated thumbnail to store next to a journal photo. */
  thumbnail: z
    .object({
      contentType: z.enum(IMAGE_CONTENT_TYPES),
      size: z.number().int().positive().max(2 * 1024 * 1024),
    })
    .optional(),
});

export const completeUploadSchema = z.object({
  target: uploadTargetSchema,
  path: z.string().max(300),
  thumbPath: z.string().max(300).optional(),
  width: dimension.optional(),
  height: dimension.optional(),
  caption: z.string().trim().max(500).optional(),
});
