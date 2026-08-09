import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/site.config";

import "./globals.css";

// Weights are enumerated rather than taking whole families: every extra cut is bytes on a
// site whose real payload should be photographs.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  // `template` gives every page a consistent suffix without repeating the site name in
  // each route's own title.
  title: {
    default: `${siteConfig.shortName} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="bg-ink text-paper flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/*
          Page views and visitors, cookieless and without a consent banner. It injects a
          script only when running on Vercel, so local `yarn dev` and `yarn build` are
          unaffected and no request goes out in development.
        */}
        <Analytics />
      </body>
    </html>
  );
}
