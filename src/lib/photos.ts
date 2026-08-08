import fs from "node:fs";
import path from "node:path";

import { CONTENT_DIR } from "./content-dir";
import {
  ContentValidationError,
  collectionsFileSchema,
  parseContent,
  photoSchema,
  photosFileSchema,
  type Collection,
  type Photo,
} from "./schema";

/**
 * Loads and validates the photo library.
 *
 * Read from disk rather than imported as a module so the pipeline's output is picked up
 * without any bundler indirection, and so tests can point at fixture directories.
 */

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new ContentValidationError(
      path.relative(process.cwd(), filePath),
      "File does not exist. Run `yarn ingest --local` to generate it.",
    );
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ContentValidationError(
      path.relative(process.cwd(), filePath),
      `File is not valid JSON: ${detail}`,
    );
  }
}

/**
 * Checks the things a per-file schema structurally cannot: uniqueness, and that every
 * cross-reference points at something real.
 *
 * Without this, a typo'd collection slug on a photo would not fail anything -- the photo
 * would just silently vanish from the collection page it was supposed to appear in. A
 * loud build failure beats a quietly missing photo.
 */
function assertReferentialIntegrity(
  photos: readonly Photo[],
  collections: readonly Collection[],
): void {
  const problems: string[] = [];

  const photoSlugs = new Set<string>();
  for (const photo of photos) {
    if (photoSlugs.has(photo.slug)) {
      problems.push(`Duplicate photo slug "${photo.slug}".`);
    }
    photoSlugs.add(photo.slug);
  }

  const collectionSlugs = new Set<string>();
  for (const collection of collections) {
    if (collectionSlugs.has(collection.slug)) {
      problems.push(`Duplicate collection slug "${collection.slug}".`);
    }
    collectionSlugs.add(collection.slug);
  }

  for (const photo of photos) {
    for (const slug of photo.collections) {
      if (!collectionSlugs.has(slug)) {
        problems.push(
          `Photo "${photo.slug}" references unknown collection "${slug}".`,
        );
      }
    }
  }

  for (const collection of collections) {
    if (!photoSlugs.has(collection.coverPhotoSlug)) {
      problems.push(
        `Collection "${collection.slug}" has cover photo "${collection.coverPhotoSlug}", which does not exist.`,
      );
    }
  }

  // A collection page with nothing on it is a dead end for visitors and a thin page for
  // search engines, so it counts as broken content rather than an empty state to render.
  for (const collection of collections) {
    const hasPhotos = photos.some((photo) =>
      photo.collections.includes(collection.slug),
    );
    if (!hasPhotos) {
      problems.push(`Collection "${collection.slug}" contains no photos.`);
    }
  }

  if (problems.length > 0) {
    throw new ContentValidationError(
      "content/",
      problems.map((problem) => `✖ ${problem}`).join("\n"),
    );
  }
}

/**
 * Parses `photos.json` one entry at a time so failures name the photo, not an array index.
 *
 * `[7].caption` tells you nothing when you are looking at a 60-entry generated file. Since
 * every entry that reaches here has already come out of the pipeline with a slug, that
 * slug is the label worth putting in the error.
 */
function parsePhotosFile(data: unknown): readonly Photo[] {
  if (!Array.isArray(data)) {
    return parseContent(photosFileSchema, data, "content/photos.json");
  }

  return data.map((entry: unknown, index) => {
    const label =
      isRecord(entry) && typeof entry["slug"] === "string"
        ? `photo "${entry["slug"]}"`
        : `photo #${String(index)}`;

    return parseContent(photoSchema, entry, `content/photos.json (${label})`);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Newest first, with undated photos last.
 *
 * Ties break on slug so ordering is deterministic -- otherwise two photos from the same
 * second could swap places between builds and produce noisy diffs in the rendered output.
 */
function byCapturedAtDesc(a: Photo, b: Photo): number {
  if (a.capturedAt === null && b.capturedAt === null) {
    return a.slug.localeCompare(b.slug);
  }
  if (a.capturedAt === null) return 1;
  if (b.capturedAt === null) return -1;

  const diff = Date.parse(b.capturedAt) - Date.parse(a.capturedAt);
  return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
}

export interface Library {
  readonly photos: readonly Photo[];
  readonly collections: readonly Collection[];
  readonly photosBySlug: ReadonlyMap<string, Photo>;
  readonly collectionsBySlug: ReadonlyMap<string, Collection>;
}

/**
 * Sorts, validates and indexes an already-parsed library.
 *
 * Kept pure and separate from the file reading so the interesting logic -- ordering and
 * referential integrity -- can be tested against fixtures without touching disk.
 */
export function buildLibrary(
  rawPhotos: readonly Photo[],
  rawCollections: readonly Collection[],
): Library {
  const photos = [...rawPhotos].sort(byCapturedAtDesc);
  const collections = [...rawCollections].sort(
    (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
  );

  assertReferentialIntegrity(photos, collections);

  return {
    photos,
    collections,
    photosBySlug: new Map(photos.map((photo) => [photo.slug, photo])),
    collectionsBySlug: new Map(
      collections.map((collection) => [collection.slug, collection]),
    ),
  };
}

let cached: Library | null = null;

function loadLibrary(): Library {
  if (cached !== null) {
    return cached;
  }

  cached = buildLibrary(
    parsePhotosFile(readJson(path.join(CONTENT_DIR, "photos.json"))),
    parseContent(
      collectionsFileSchema,
      readJson(path.join(CONTENT_DIR, "collections.json")),
      "content/collections.json",
    ),
  );
  return cached;
}

/** Test-only: drops the memoized library so a test can swap the content directory. */
export function resetLibraryCache(): void {
  cached = null;
}

export function getAllPhotos(): readonly Photo[] {
  return loadLibrary().photos;
}

export function getAllCollections(): readonly Collection[] {
  return loadLibrary().collections;
}

/** Returns `undefined` for unknown slugs so routes can render a 404 rather than throw. */
export function getPhotoBySlug(slug: string): Photo | undefined {
  return loadLibrary().photosBySlug.get(slug);
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return loadLibrary().collectionsBySlug.get(slug);
}

export function getPhotosInCollection(
  collectionSlug: string,
): readonly Photo[] {
  return loadLibrary().photos.filter((photo) =>
    photo.collections.includes(collectionSlug),
  );
}

/**
 * The home feed: featured photos first, then everything else, each group newest first.
 *
 * Featured is a deliberate editorial override -- the strongest work should greet a
 * visitor regardless of when it was shot.
 */
export function sortHomeFeed(photos: readonly Photo[]): readonly Photo[] {
  return [
    ...photos.filter((photo) => photo.featured),
    ...photos.filter((photo) => !photo.featured),
  ];
}

export function getHomeFeedPhotos(): readonly Photo[] {
  return sortHomeFeed(loadLibrary().photos);
}

/** Resolves a collection's cover photo. Referential integrity guarantees it exists. */
export function getCoverPhoto(collection: Collection): Photo {
  const photo = loadLibrary().photosBySlug.get(collection.coverPhotoSlug);
  if (photo === undefined) {
    throw new ContentValidationError(
      "content/collections.json",
      `Cover photo "${collection.coverPhotoSlug}" for collection "${collection.slug}" does not exist.`,
    );
  }
  return photo;
}
