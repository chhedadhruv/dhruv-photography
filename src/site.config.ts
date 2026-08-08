/**
 * Every piece of site-wide identity lives here, so changing your bio or adding a social
 * link never means hunting through components. Metadata, JSON-LD, the footer, and the
 * About and Gear pages all read from this object.
 */

/** Read an env var, failing loudly rather than baking `undefined` into the built HTML. */
function requireEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value !== undefined && value !== "" ? value : fallback;
}

export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export interface GearItem {
  readonly category: "Camera" | "Lens" | "Accessory";
  readonly name: string;
  readonly note: string;
}

export const siteConfig = {
  name: "Dhruv Chheda Photography",
  shortName: "Dhruv Chheda",
  /** Used as the `<title>` suffix and in structured data. */
  tagline: "Travel, street, landscape and portrait photography",
  description:
    "Photographs by Dhruv Chheda — travel, street, landscape and portrait work, with full shooting notes for each frame.",

  // TODO(dhruv): replace the localhost fallback once the subdomain is live.
  url: requireEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  /**
   * Base URL for image derivatives. Defaults to the local `--local` ingest output so the
   * site runs end-to-end before any R2 credentials exist.
   */
  imageBaseUrl: requireEnv("NEXT_PUBLIC_IMAGE_BASE_URL", "/images"),

  author: {
    name: "Dhruv Chheda",
    // TODO(dhruv): your real bio. This is also the text most likely to rank for your name.
    bio: "I'm a software developer and hobbyist photographer. I shoot mostly while travelling — cities at street level, landscapes when I can get out of them, and the people I meet along the way.",
    /** Where the `Person` structured data points as your canonical home. */
    homepage: "https://dhruvchheda.com",
  },

  // TODO(dhruv): real handles. These render in the footer and as `sameAs` in JSON-LD,
  // which is how search engines connect this site to your other profiles.
  socials: [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "GitHub", href: "https://github.com/" },
    { label: "Main site", href: "https://dhruvchheda.com" },
  ] as const satisfies readonly SocialLink[],

  // TODO(dhruv): your actual kit.
  gear: [
    {
      category: "Camera",
      name: "Placeholder body",
      note: "Replace with what you actually shoot.",
    },
    {
      category: "Lens",
      name: "Placeholder lens",
      note: "Replace with what you actually shoot.",
    },
  ] as const satisfies readonly GearItem[],

  /** Rendered on photo pages. View-only site, so this is the licensing signal. */
  copyright: "All photographs © Dhruv Chheda. Please ask before reusing them.",
} as const;

export type SiteConfig = typeof siteConfig;
