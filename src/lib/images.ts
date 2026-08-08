import { siteConfig } from "@/site.config";

import type { Photo } from "./schema";

/**
 * The one definition of where an image derivative lives.
 *
 * Both the ingest pipeline (which writes them) and the site (which reads them) import
 * from here, so the two cannot drift apart. A mismatch would mean 404s that only show up
 * in production.
 */

/**
 * AVIF first because it is meaningfully smaller than WebP at the same quality; WebP is the
 * fallback for browsers that lack AVIF. `<picture>` picks the first one it understands, so
 * order matters here.
 */
export const IMAGE_FORMATS = ["avif", "webp"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/**
 * Derivative widths, chosen to cover a phone through a 2x desktop display.
 *
 * The pipeline never upscales, so a photo only gets the widths its original can support --
 * which is why each photo records the widths it actually has rather than assuming these.
 */
export const TARGET_WIDTHS = [400, 800, 1200, 1600, 2400] as const;

/** Storage key, relative to the bucket root or the local `public/images` directory. */
export function derivativeKey(
  slug: string,
  width: number,
  format: ImageFormat,
): string {
  return `photos/${slug}/${String(width)}.${format}`;
}

/** Public URL for a derivative, resolved against the configured image origin. */
export function derivativeUrl(
  slug: string,
  width: number,
  format: ImageFormat,
): string {
  const base = siteConfig.imageBaseUrl.replace(/\/$/, "");
  return `${base}/${derivativeKey(slug, width, format)}`;
}

/**
 * A `srcset` listing only the widths this photo actually has.
 *
 * Promising a width that was never generated would produce a 404 for exactly the visitors
 * on the widest screens, which is why `derivativeWidths` is stored per photo.
 */
export function buildSrcSet(photo: Photo, format: ImageFormat): string {
  return photo.derivativeWidths
    .map(
      (width) =>
        `${derivativeUrl(photo.slug, width, format)} ${String(width)}w`,
    )
    .join(", ");
}

/** The largest available derivative, used as the `src` fallback. */
export function largestDerivativeUrl(
  photo: Photo,
  format: ImageFormat = "webp",
): string {
  const widest = Math.max(...photo.derivativeWidths);
  return derivativeUrl(photo.slug, widest, format);
}

/** `width / height`, for reserving layout space before the image loads. */
export function aspectRatio(photo: Photo): number {
  return photo.width / photo.height;
}

export function isLandscape(photo: Photo): boolean {
  return photo.width >= photo.height;
}
