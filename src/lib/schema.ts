import { z } from "zod";

/**
 * The single definition of what valid content looks like.
 *
 * These schemas are the reason the "no `any`, no suppressions" rule is workable: the
 * ingest pipeline and the markdown files both hand us loosely-typed data, and parsing it
 * here converts `unknown` into real types at one controlled boundary. Everything
 * downstream gets to be honestly typed.
 *
 * They run at module load, so invalid content fails `yarn build` rather than shipping a
 * broken page.
 */

/** Lowercase kebab-case. Slugs become URLs and R2 keys, so they must be predictable. */
const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "must be lowercase kebab-case (letters, digits and single hyphens)",
  );

/**
 * EXIF fields are individually nullable because cameras and editing software are
 * inconsistent about what they write, and a scanned or phone-edited file may carry almost
 * nothing. Nullable-but-present beats optional here: it forces the pipeline to make an
 * explicit decision per field, and forces the UI to handle the missing case.
 */
export const exifSchema = z.object({
  /** Make and model already joined, e.g. "Fujifilm X-T30". */
  camera: z.string().min(1).nullable(),
  lens: z.string().min(1).nullable(),
  /** Millimetres, as shot (not 35mm-equivalent). */
  focalLength: z.number().positive().nullable(),
  /** The f-number itself, e.g. 2.8 -- rendered as "f/2.8". */
  aperture: z.number().positive().nullable(),
  /** Pre-formatted because "1/250" reads better than 0.004. */
  shutter: z.string().min(1).nullable(),
  iso: z.number().int().positive().nullable(),
});

export const photoSchema = z.object({
  slug: slugSchema,

  /** Original filename, kept so re-running ingest can recognise a photo it has seen. */
  sourceFile: z.string().min(1),

  title: z.string().min(1, "every photo needs a title"),

  /**
   * Required, and required to be meaningful. Alt text is both the accessibility contract
   * and the single strongest signal for Google Images, which is a stated goal for this
   * site -- so the schema refuses to let a photo through without it.
   */
  alt: z
    .string()
    .min(10, "alt text should actually describe the image, not just name it"),

  /**
   * The words that make a per-photo page worth having. A photo page with no prose is thin
   * content that helps nobody, so this is required rather than optional.
   */
  caption: z.string().min(1, "write a caption before publishing this photo"),

  /** Human-readable, e.g. "Bandra, Mumbai". Null for frames with no meaningful place. */
  location: z.string().min(1).nullable(),

  /** ISO 8601, from EXIF DateTimeOriginal. Null when the file carries no date. */
  capturedAt: z.iso.datetime().nullable(),

  /** Collection slugs this photo belongs to. Empty means home feed only. */
  collections: z.array(slugSchema),

  /** Shown before everything else in the home feed. */
  featured: z.boolean(),

  /** Intrinsic pixel dimensions. Present so pages can reserve space and avoid layout shift. */
  width: z.number().int().positive(),
  height: z.number().int().positive(),

  /**
   * Widths actually generated. Stored per photo rather than assumed globally, because the
   * pipeline never upscales -- a small original yields fewer derivatives, and a srcset
   * that promised widths which do not exist would 404.
   */
  derivativeWidths: z
    .array(z.number().int().positive())
    .min(1, "at least one derivative width must exist"),

  /** Tiny inlined placeholder, rendered while the real image loads. */
  blurDataUrl: z
    .string()
    .regex(/^data:image\/[a-z]+;base64,/, "must be an inline base64 data URI"),

  exif: exifSchema,
});

export const collectionSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),

  /**
   * Doubles as the meta description for the collection page, which is why it has a
   * minimum: a one-word description would waste the most valuable text on the page.
   */
  description: z
    .string()
    .min(40, "collections need a real description for SEO"),

  /** The place this collection is about, if it is about a place. Feeds location SEO. */
  location: z.string().min(1).nullable(),

  coverPhotoSlug: slugSchema,

  /** Ascending. Lets you order collections deliberately rather than alphabetically. */
  order: z.number().int().nonnegative(),
});

export const journalFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(40, "posts need a real description for SEO"),
  /** Date only -- posts are not precise to the second. */
  publishedAt: z.iso.date(),
  tags: z.array(z.string().min(1)),
  /** Optional hero image, referenced by slug so it reuses an existing photo. */
  coverPhotoSlug: slugSchema.optional(),
  /** Hidden from listings and the sitemap, but still buildable locally. */
  draft: z.boolean().default(false),
});

export const photosFileSchema = z.array(photoSchema);
export const collectionsFileSchema = z.array(collectionSchema);

/**
 * The same photo, with the editorial minimums relaxed.
 *
 * The ingest pipeline reads `photos.json` back to carry your captions forward across runs,
 * and at that point the file legitimately contains freshly ingested photos whose alt and
 * caption are still empty. The strict schema is the gate the *site* has to pass; the
 * pipeline needs to be able to read its own work in progress.
 */
export const draftPhotoSchema = photoSchema.extend({
  alt: z.string(),
  caption: z.string(),
});

export const draftPhotosFileSchema = z.array(draftPhotoSchema);

export type Exif = z.infer<typeof exifSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type JournalFrontmatter = z.infer<typeof journalFrontmatterSchema>;

/**
 * Thrown when content does not match its schema. Carries the source file so the message
 * points at the thing to edit -- a build failure is only useful if it says where to look.
 */
export class ContentValidationError extends Error {
  constructor(source: string, details: string) {
    super(`Invalid content in ${source}:\n${details}`);
    this.name = "ContentValidationError";
  }
}

/**
 * Parse `data` or throw with a readable, located message.
 *
 * This is the choke point where `unknown` becomes typed. Callers get real types back
 * without a cast anywhere.
 */
export function parseContent<Output>(
  schema: z.ZodType<Output>,
  data: unknown,
  source: string,
): Output {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContentValidationError(source, z.prettifyError(result.error));
  }
  return result.data;
}
