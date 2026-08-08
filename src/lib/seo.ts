import { largestDerivativeUrl } from "./images";
import type { Photo } from "./schema";

import { siteConfig } from "@/site.config";

/**
 * URL helpers for metadata and structured data.
 *
 * Structured data and sitemaps both require absolute URLs -- a relative path in a
 * `sameAs` or an `ImageObject.contentUrl` is silently ignored rather than rejected, which
 * is the worst kind of failure because nothing appears to be wrong.
 */

/** Absolute URL for a site path, e.g. `/about` -> `https://.../about`. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteConfig.url).toString();
}

/**
 * Absolute URL for an image derivative.
 *
 * `imageBaseUrl` is a path (`/images`) during local development and a full origin (an R2
 * custom domain) in production, so both cases have to resolve correctly.
 */
export function absoluteImageUrl(photo: Photo): string {
  const url = largestDerivativeUrl(photo);
  return url.startsWith("http") ? url : absoluteUrl(url);
}

/** Every URL a search engine should know about. Shared by the sitemap and the crawler rules. */
export const ROUTES = {
  home: "/",
  collections: "/collections",
  journal: "/journal",
  about: "/about",
  gear: "/gear",
} as const;
