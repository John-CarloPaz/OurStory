import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Fraunces, Inter, Newsreader, Permanent_Marker, Special_Elite } from "next/font/google";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { AmbientBackground, GrainLayer } from "@/components/decor/ambient-background";
import { APP_NAME } from "@/lib/env";
import { DEFAULT_THEME, themeVariables } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  preload: false,
});
// Scrapbook lettering, only downloaded when a page uses it.
const specialElite = Special_Elite({ subsets: ["latin"], variable: "--font-special-elite", weight: "400", preload: false });
const permanentMarker = Permanent_Marker({ subsets: ["latin"], variable: "--font-permanent-marker", weight: "400", preload: false });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "A private place for two people to keep their story.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: DEFAULT_THEME.background_color,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [inter, fraunces, newsreader, caveat, cormorant, specialElite, permanentMarker].map((f) => f.variable).join(" ");

  return (
    // data-scroll-behavior: jump (not smooth-scroll) to the top when changing pages.
    <html lang="en" className={fonts} data-scroll-behavior="smooth">
      <body className="os-bg-aurora min-h-dvh" style={themeVariables(DEFAULT_THEME)}>
        <AmbientBackground />
        <GrainLayer />
        <TimeZoneSync />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
