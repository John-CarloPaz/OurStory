import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Fraunces, Inter, Newsreader } from "next/font/google";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { APP_NAME } from "@/lib/env";
import { DEFAULT_THEME, themeVariables } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  preload: false,
});
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", preload: false });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "A private place for two people to keep their story.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: DEFAULT_THEME.background_color,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [inter, fraunces, newsreader, cormorant, caveat].map((f) => f.variable).join(" ");

  return (
    <html lang="en" className={fonts}>
      <body className="os-bg-paper min-h-dvh" style={themeVariables(DEFAULT_THEME)}>
        <TimeZoneSync />
        {children}
      </body>
    </html>
  );
}
