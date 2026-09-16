import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

const KEYS = ["SITE_URL", "NEXT_PUBLIC_SITE_URL", "VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL", "VERCEL_URL"];

function withEnv(values: Record<string, string>) {
  for (const key of KEYS) vi.stubEnv(key, values[key] ?? "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("uses the configured URL, without a trailing slash", () => {
    withEnv({ NEXT_PUBLIC_SITE_URL: "https://our-story-a7ui.vercel.app/" });
    expect(getSiteUrl()).toBe("https://our-story-a7ui.vercel.app");
  });

  it("is read at request time, so changing the variable takes effect without a rebuild", () => {
    withEnv({ NEXT_PUBLIC_SITE_URL: "https://first.example.com" });
    expect(getSiteUrl()).toBe("https://first.example.com");
    withEnv({ NEXT_PUBLIC_SITE_URL: "https://second.example.com" });
    expect(getSiteUrl()).toBe("https://second.example.com");
  });

  it("never returns localhost on Vercel: falls back to the production domain", () => {
    withEnv({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "our-story-a7ui.vercel.app" });
    expect(getSiteUrl()).toBe("https://our-story-a7ui.vercel.app");

    withEnv({
      VERCEL: "1",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      VERCEL_PROJECT_PRODUCTION_URL: "our-story-a7ui.vercel.app",
    });
    expect(getSiteUrl()).toBe("https://our-story-a7ui.vercel.app");
  });

  it("uses the branch URL for Vercel previews", () => {
    withEnv({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "our-story-git-feature.vercel.app", VERCEL_URL: "our-story-abc123.vercel.app" });
    expect(getSiteUrl()).toBe("https://our-story-git-feature.vercel.app");
  });

  it("keeps localhost for local development", () => {
    withEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    expect(getSiteUrl()).toBe("http://localhost:3000");
    withEnv({});
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
