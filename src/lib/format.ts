import type { Exif, Photo } from "./schema";

/**
 * Display formatting. Kept out of components so the rules live in one place and can be
 * tested without rendering anything.
 */

/**
 * Formats a capture date, reading it as UTC on purpose.
 *
 * `capturedAt` is a wall-clock time the camera recorded, stored with a `Z` suffix so it
 * survives the pipeline unshifted (see `pipeline/exif.ts`). Formatting it in the viewer's
 * local timezone would re-introduce exactly the shift the pipeline avoids, and a photo
 * taken at dawn would read as the night before for half the world.
 */
export function formatCaptureDate(capturedAt: string | null): string | null {
  if (capturedAt === null) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(capturedAt));
}

/** Post dates are date-only, so they are parsed as UTC to avoid an off-by-one day. */
export function formatPostDate(publishedAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${publishedAt}T00:00:00.000Z`));
}

/**
 * The shooting data, in the order a photographer reads it: focal length, aperture,
 * shutter, ISO. Missing values are dropped rather than rendered as blanks or dashes --
 * a gap in the strip says "unknown" more honestly than "--" does.
 */
export function exifSummary(exif: Exif): readonly string[] {
  return [
    exif.focalLength === null ? null : `${String(exif.focalLength)}mm`,
    exif.aperture === null ? null : `f/${String(exif.aperture)}`,
    exif.shutter,
    exif.iso === null ? null : `ISO ${String(exif.iso)}`,
  ].filter((part): part is string => part !== null);
}

/** True when a photo carries no shooting data at all, so the strip can be omitted. */
export function hasExif(exif: Exif): boolean {
  return (
    exif.camera !== null || exif.lens !== null || exifSummary(exif).length > 0
  );
}

/**
 * Frame index, zero-padded like a film frame counter.
 *
 * Numbering here is not decoration: the feed is chronological, so the index is the frame's
 * real position in the sequence.
 */
export function frameIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Location and date joined for a single-line dateline, skipping whichever is absent. */
export function dateline(photo: Photo): string | null {
  const parts = [photo.location, formatCaptureDate(photo.capturedAt)].filter(
    (part): part is string => part !== null,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}
