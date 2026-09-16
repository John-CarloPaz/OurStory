import { describe, expect, it } from "vitest";
import { formatCalendarDate, utcToZonedParts, zonedTimeToUtc } from "@/lib/dates";
import { contrastRatio, DEFAULT_THEME, THEME_PRESETS, THEME_PRESET_NAMES, themeVariables, toThemeSettings } from "@/lib/theme";
import { createSpaceSchema, eventSchema, journalSchema, letterSchema } from "@/lib/validation";

describe("time zones", () => {
  it("converts wall-clock times in a zone to UTC and back, across DST", () => {
    expect(zonedTimeToUtc("2026-12-25", "09:00", "Asia/Manila").toISOString()).toBe("2026-12-25T01:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-04", "19:30", "America/New_York").toISOString()).toBe("2026-07-04T23:30:00.000Z");
    expect(zonedTimeToUtc("2026-01-04", "19:30", "America/New_York").toISOString()).toBe("2026-01-05T00:30:00.000Z");
    expect(utcToZonedParts("2026-07-04T23:30:00.000Z", "America/New_York")).toEqual({ date: "2026-07-04", time: "19:30" });
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatCalendarDate("2026-09-14")).toBe("September 14, 2026");
  });
});

describe("themes", () => {
  it("every preset produces readable text and accent colors", () => {
    for (const name of THEME_PRESET_NAMES) {
      const vars = themeVariables({ ...DEFAULT_THEME, name, primary_color: THEME_PRESETS[name].primary, background_color: THEME_PRESETS[name].background }) as Record<string, string>;
      expect(contrastRatio(vars["--os-ink"], vars["--os-bg"]), `${name} ink`).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(vars["--os-primary"], vars["--os-bg"]), `${name} accent`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps a low-contrast custom accent legible", () => {
    const vars = themeVariables({ ...DEFAULT_THEME, primary_color: "#f7efe6", background_color: "#f6f0e6" }) as Record<string, string>;
    expect(contrastRatio(vars["--os-primary"], vars["--os-bg"])).toBeGreaterThanOrEqual(3);
  });

  it("falls back to defaults for unexpected stored values", () => {
    expect(toThemeSettings({ name: "neon", card_style: "3d", primary_color: "red" })).toEqual(DEFAULT_THEME);
  });
});

describe("validation", () => {
  it("never accepts a client-supplied couple_id", () => {
    const parsed = createSpaceSchema.parse({
      creatorName: " John ",
      partnerEmail: "Kath@Example.com ",
      coupleName: "",
      storyBeganOn: "2026-09-14",
      couple_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed).toEqual({ creatorName: "John", partnerEmail: "kath@example.com", coupleName: null, storyBeganOn: "2026-09-14" });
  });

  it("normalizes multi-select place ids", () => {
    const one = journalSchema.parse({ title: "x", entryDate: "2026-09-14", "placeIds[]": "11111111-1111-4111-8111-111111111111" });
    expect(one["placeIds[]"]).toHaveLength(1);
    expect(() => journalSchema.parse({ title: "x", entryDate: "2026-09-14", "placeIds[]": ["not-a-uuid"] })).toThrow();
  });

  it("requires a start time unless the event is all day", () => {
    expect(eventSchema.safeParse({ title: "Dinner", date: "2026-09-20" }).success).toBe(false);
    expect(eventSchema.safeParse({ title: "Trip", date: "2026-09-20", allDay: "on" }).success).toBe(true);
    expect(eventSchema.safeParse({ title: "Dinner", date: "2026-09-20", startTime: "20:00", endTime: "19:00" }).success).toBe(false);
  });

  it("requires letter content and an unlock moment", () => {
    expect(letterSchema.safeParse({ title: "For you", content: "   ", unlockDate: "2026-12-25", unlockTime: "09:00" }).success).toBe(false);
    expect(letterSchema.safeParse({ title: "For you", content: "Hi", unlockDate: "2026-12-25", unlockTime: "9am" }).success).toBe(false);
  });
});
