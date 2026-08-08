import exifr from "exifr";
import { z } from "zod";

import type { Exif } from "@/lib/schema";

/**
 * EXIF extraction, normalized into the shape the site actually renders.
 *
 * exifr returns `any`-shaped data whose contents vary by camera, by editing software, and
 * by whether the file has been through a messaging app. Rather than casting it, everything
 * goes through a permissive Zod schema: each field is optional and, if present but the
 * wrong type, is dropped rather than throwing. A photo with mangled EXIF should still
 * publish -- it just publishes without shooting notes.
 */

/**
 * `.catch(undefined)` per field is the important detail: a single malformed tag degrades
 * that one field instead of failing the whole photo.
 */
const rawExifSchema = z.object({
  Make: z.string().optional().catch(undefined),
  Model: z.string().optional().catch(undefined),
  LensModel: z.string().optional().catch(undefined),
  ExposureTime: z.number().positive().optional().catch(undefined),
  FNumber: z.number().positive().optional().catch(undefined),
  ISO: z.number().positive().optional().catch(undefined),
  FocalLength: z.number().positive().optional().catch(undefined),
  DateTimeOriginal: z.string().optional().catch(undefined),
  CreateDate: z.string().optional().catch(undefined),
});

export interface ExtractedExif {
  readonly exif: Exif;
  /** ISO 8601, or null when the file carries no usable date. */
  readonly capturedAt: string | null;
}

const EMPTY_EXIF: Exif = {
  camera: null,
  lens: null,
  focalLength: null,
  aperture: null,
  shutter: null,
  iso: null,
};

/**
 * Joins make and model without repeating the brand.
 *
 * Cameras commonly write Make "NIKON CORPORATION" and Model "NIKON Z6", which naively
 * concatenated reads "NIKON CORPORATION NIKON Z6".
 */
export function formatCamera(
  make: string | undefined,
  model: string | undefined,
): string | null {
  const cleanMake = make?.trim() ?? "";
  const cleanModel = model?.trim() ?? "";

  if (cleanModel === "") {
    return cleanMake === "" ? null : cleanMake;
  }
  if (cleanMake === "") {
    return cleanModel;
  }

  const firstWord = cleanMake.split(/\s+/)[0] ?? cleanMake;
  const modelRepeatsMake = cleanModel
    .toLowerCase()
    .startsWith(firstWord.toLowerCase());

  return modelRepeatsMake ? cleanModel : `${cleanMake} ${cleanModel}`;
}

/**
 * Renders exposure time the way photographers read it: "1/250" rather than 0.004, and
 * whole seconds as "2s" rather than "2/1".
 */
export function formatShutter(exposureTime: number | undefined): string | null {
  if (exposureTime === undefined || exposureTime <= 0) {
    return null;
  }
  if (exposureTime >= 1) {
    // Trim a trailing ".0" so 2 seconds reads "2s", not "2.0s".
    return `${String(Number(exposureTime.toFixed(1)))}s`;
  }
  return `1/${String(Math.round(1 / exposureTime))}`;
}

/**
 * Converts an EXIF timestamp to ISO 8601, preserving the wall-clock time it was shot at.
 *
 * EXIF stores "2025:01:15 06:12:00" with no timezone. exifr's default behaviour is to
 * interpret that in the *ingesting machine's* timezone and convert to UTC -- so a dawn
 * frame ingested in India would be stored as 00:42Z and rendered as the previous night.
 * The camera's local time is the only meaningful reading, so it is taken at face value and
 * labelled UTC. Formatting must therefore also read it as UTC, which `lib/format.ts` does.
 */
export function parseExifTimestamp(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    value,
  );
  if (match === null) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const iso = `${String(year)}-${String(month)}-${String(day)}T${String(hour)}:${String(minute)}:${String(second)}.000Z`;

  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/**
 * Reads EXIF from an image buffer. Never throws for content reasons -- a file with no
 * EXIF, or with EXIF this cannot understand, yields empty fields.
 */
export async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  const parsed: unknown = await exifr
    .parse(buffer, {
      tiff: true,
      exif: true,
      // Keep raw values so timestamps arrive as strings rather than as Dates already
      // shifted into this machine's timezone.
      reviveValues: false,
    })
    .catch(() => undefined);

  // Files with no EXIF block at all -- phone screenshots, stripped exports -- return
  // undefined rather than an empty object.
  if (parsed === undefined || parsed === null) {
    return { exif: EMPTY_EXIF, capturedAt: null };
  }

  const result = rawExifSchema.safeParse(parsed);
  if (!result.success) {
    return { exif: EMPTY_EXIF, capturedAt: null };
  }
  const raw = result.data;

  return {
    exif: {
      camera: formatCamera(raw.Make, raw.Model),
      lens: raw.LensModel?.trim() ?? null,
      focalLength: raw.FocalLength ?? null,
      aperture: raw.FNumber ?? null,
      shutter: formatShutter(raw.ExposureTime),
      iso: raw.ISO ?? null,
    },
    capturedAt:
      parseExifTimestamp(raw.DateTimeOriginal) ??
      parseExifTimestamp(raw.CreateDate),
  };
}
