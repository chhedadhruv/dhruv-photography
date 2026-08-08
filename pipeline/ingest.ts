import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import dotenv from "dotenv";

import { derivativeKey } from "@/lib/images";
import { draftPhotosFileSchema, type Photo } from "@/lib/schema";

import { extractExif } from "./exif";
import { processImage } from "./images";
import { createLocalStorage, createR2Storage, type Storage } from "./storage";

/**
 * `yarn ingest` -- turns raw files in `originals/` into derivatives plus `content/photos.json`.
 *
 * Run by hand, never as part of the build. The build reads only the committed JSON, which
 * is what keeps it fast, hermetic, and independent of any credentials.
 */

dotenv.config({ path: ".env.local", quiet: true });

const ORIGINALS_DIR = path.join(process.cwd(), "originals");
const PHOTOS_FILE = path.join(process.cwd(), "content", "photos.json");

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

/**
 * Fields you write and the pipeline must never overwrite.
 *
 * Re-running ingest re-derives everything technical, but editorial text is the expensive
 * part -- clobbering a caption you spent ten minutes on because you re-ran a command would
 * be unforgivable.
 */
interface EditorialFields {
  title: string;
  alt: string;
  caption: string;
  location: string | null;
  collections: string[];
  featured: boolean;
}

/** "DSCF1234-harbour-at-dawn.jpg" -> "dscf1234-harbour-at-dawn" */
export function slugFromFilename(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "dscf1234-harbour-at-dawn" -> "Dscf1234 harbour at dawn", as a starting point to edit. */
export function titleFromSlug(slug: string): string {
  const words = slug.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Reads the previous run's output so editorial text survives.
 *
 * Parsed with the *draft* schema, not the strict one: the file being read may contain
 * photos ingested moments ago whose captions are not written yet. Anything unreadable is
 * treated as absent rather than fatal -- the pipeline should still be able to run when the
 * file is missing or has been hand-edited into invalidity.
 */
async function readExistingPhotos(): Promise<readonly Photo[]> {
  try {
    const raw = await fs.readFile(PHOTOS_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    const result = draftPhotosFileSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * Carries forward editorial text for a photo that has been ingested before, and supplies
 * empty starting values for one that has not.
 *
 * Empty `alt` and `caption` are deliberate: they will fail the site's schema, so a photo
 * cannot silently go live without the words that make its page worth having. The run
 * summary lists exactly which photos are waiting on you.
 */
function editorialFor(
  existing: Photo | undefined,
  slug: string,
): EditorialFields {
  if (existing !== undefined) {
    return {
      title: existing.title,
      alt: existing.alt,
      caption: existing.caption,
      location: existing.location,
      collections: [...existing.collections],
      featured: existing.featured,
    };
  }

  return {
    title: titleFromSlug(slug),
    alt: "",
    caption: "",
    location: null,
    collections: [],
    featured: false,
  };
}

async function listOriginals(): Promise<readonly string[]> {
  try {
    const entries = await fs.readdir(ORIGINALS_DIR);
    return entries
      .filter((name) =>
        SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()),
      )
      .sort();
  } catch {
    return [];
  }
}

async function ingestOne(
  filename: string,
  existing: Photo | undefined,
  storage: Storage,
): Promise<Photo> {
  const slug = slugFromFilename(filename);
  const buffer = await fs.readFile(path.join(ORIGINALS_DIR, filename));

  const [{ exif, capturedAt }, processed] = await Promise.all([
    extractExif(buffer),
    processImage(buffer),
  ]);

  for (const derivative of processed.derivatives) {
    await storage.put(
      derivativeKey(slug, derivative.width, derivative.format),
      derivative.data,
      derivative.format,
    );
  }

  return {
    slug,
    sourceFile: filename,
    ...editorialFor(existing, slug),
    capturedAt,
    width: processed.width,
    height: processed.height,
    derivativeWidths: [
      ...new Set(processed.derivatives.map((d) => d.width)),
    ].sort((a, b) => a - b),
    blurDataUrl: processed.blurDataUrl,
    exif,
  };
}

function reportMissingCopy(photos: readonly Photo[]): void {
  const incomplete = photos.filter(
    (photo) => photo.alt.trim() === "" || photo.caption.trim() === "",
  );

  if (incomplete.length === 0) {
    return;
  }

  console.log(
    `\n${String(incomplete.length)} photo(s) need alt text and a caption before the site will build:`,
  );
  for (const photo of incomplete) {
    const missing = [
      photo.alt.trim() === "" ? "alt" : null,
      photo.caption.trim() === "" ? "caption" : null,
    ]
      .filter((field) => field !== null)
      .join(" and ");
    console.log(`  - ${photo.slug} (missing ${missing})`);
  }
  console.log(`\nEdit content/photos.json to fill them in.`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      local: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
  });

  const storage = values.local ? createLocalStorage() : createR2Storage();
  const existingPhotos = await readExistingPhotos();
  const existingBySource = new Map(
    existingPhotos.map((photo) => [photo.sourceFile, photo]),
  );

  const filenames = await listOriginals();
  if (filenames.length === 0) {
    console.log(
      `No images found in originals/. Drop some files in and re-run.`,
    );
    return;
  }

  console.log(
    `Ingesting ${String(filenames.length)} file(s) to ${storage.describe}.\n`,
  );

  const photos: Photo[] = [];
  for (const filename of filenames) {
    const existing = existingBySource.get(filename);

    // Re-encoding an unchanged photo is slow and produces no different bytes, so already
    // ingested files are skipped unless --force asks for a rebuild.
    if (existing !== undefined && !values.force) {
      console.log(`  skip  ${filename} (already ingested; --force to redo)`);
      photos.push(existing);
      continue;
    }

    process.stdout.write(`  ...   ${filename}`);
    const photo = await ingestOne(filename, existing, storage);
    process.stdout.write(
      `\r  done  ${filename} -> ${photo.slug} (${String(photo.derivativeWidths.length)} widths)\n`,
    );
    photos.push(photo);
  }

  photos.sort((a, b) => a.slug.localeCompare(b.slug));
  await fs.writeFile(
    PHOTOS_FILE,
    `${JSON.stringify(photos, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `\nWrote ${String(photos.length)} photo(s) to content/photos.json.`,
  );
  reportMissingCopy(photos);
}

// Invoked rather than top-level awaited: without `"type": "module"` these files load as
// CommonJS, where top-level await is unavailable. Handling the rejection here also means a
// failed run prints one readable line and exits non-zero, instead of an unhandled
// rejection warning.
main().catch((error: unknown) => {
  console.error(
    `\nIngest failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
