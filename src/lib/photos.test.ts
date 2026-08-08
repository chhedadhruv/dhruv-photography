import { describe, expect, it } from "vitest";

import { buildLibrary, sortHomeFeed } from "./photos";
import { ContentValidationError } from "./schema";
import { makeCollection, makePhoto } from "./test-fixtures";

/**
 * These cover the failures a per-file schema structurally cannot catch: ordering, and
 * references between files. Both are the kind of mistake that otherwise produces a
 * silently missing photo rather than an error.
 */

describe("buildLibrary ordering", () => {
  it("orders photos newest first", () => {
    const library = buildLibrary(
      [
        makePhoto({
          slug: "older",
          capturedAt: "2024-01-01T00:00:00.000Z",
          collections: ["coastline"],
        }),
        makePhoto({
          slug: "newer",
          capturedAt: "2025-06-01T00:00:00.000Z",
          collections: ["coastline"],
        }),
      ],
      [makeCollection({ coverPhotoSlug: "newer" })],
    );

    expect(library.photos.map((photo) => photo.slug)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("puts undated photos last rather than first", () => {
    const library = buildLibrary(
      [
        makePhoto({
          slug: "undated",
          capturedAt: null,
          collections: ["coastline"],
        }),
        makePhoto({
          slug: "dated",
          capturedAt: "2020-01-01T00:00:00.000Z",
          collections: ["coastline"],
        }),
      ],
      [makeCollection({ coverPhotoSlug: "dated" })],
    );

    expect(library.photos.map((photo) => photo.slug)).toEqual([
      "dated",
      "undated",
    ]);
  });

  // Two frames from the same second must not swap places between builds, or the rendered
  // output churns for no reason.
  it("breaks ties deterministically on slug", () => {
    const sameInstant = "2025-03-03T09:00:00.000Z";
    const library = buildLibrary(
      [
        makePhoto({
          slug: "zebra",
          capturedAt: sameInstant,
          collections: ["coastline"],
        }),
        makePhoto({
          slug: "alpha",
          capturedAt: sameInstant,
          collections: ["coastline"],
        }),
      ],
      [makeCollection({ coverPhotoSlug: "alpha" })],
    );

    expect(library.photos.map((photo) => photo.slug)).toEqual([
      "alpha",
      "zebra",
    ]);
  });

  it("orders collections by their explicit order field", () => {
    const library = buildLibrary(
      [makePhoto({ slug: "cover", collections: ["second", "first"] })],
      [
        makeCollection({
          slug: "second",
          order: 5,
          coverPhotoSlug: "cover",
        }),
        makeCollection({ slug: "first", order: 1, coverPhotoSlug: "cover" }),
      ],
    );

    expect(library.collections.map((collection) => collection.slug)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("buildLibrary referential integrity", () => {
  it("rejects duplicate photo slugs", () => {
    expect(() =>
      buildLibrary(
        [
          makePhoto({ slug: "twice" }),
          makePhoto({ slug: "twice", sourceFile: "OTHER.jpg" }),
        ],
        [makeCollection({ coverPhotoSlug: "twice" })],
      ),
    ).toThrow(/Duplicate photo slug/);
  });

  it("rejects duplicate collection slugs", () => {
    expect(() =>
      buildLibrary(
        [makePhoto({ slug: "cover", collections: ["dupe"] })],
        [
          makeCollection({ slug: "dupe", coverPhotoSlug: "cover" }),
          makeCollection({ slug: "dupe", coverPhotoSlug: "cover", order: 2 }),
        ],
      ),
    ).toThrow(/Duplicate collection slug/);
  });

  // The failure this exists to prevent: a typo'd slug would otherwise just make the photo
  // quietly absent from the collection it was meant to appear in.
  it("rejects a photo referencing a collection that does not exist", () => {
    expect(() =>
      buildLibrary(
        [makePhoto({ slug: "cover", collections: ["typoed-slug"] })],
        [makeCollection({ slug: "coastline", coverPhotoSlug: "cover" })],
      ),
    ).toThrow(/references unknown collection "typoed-slug"/);
  });

  it("rejects a collection whose cover photo does not exist", () => {
    expect(() =>
      buildLibrary(
        [makePhoto({ slug: "real-photo", collections: ["coastline"] })],
        [makeCollection({ slug: "coastline", coverPhotoSlug: "ghost-photo" })],
      ),
    ).toThrow(/cover photo "ghost-photo", which does not exist/);
  });

  it("rejects an empty collection, which would render as a dead-end page", () => {
    expect(() =>
      buildLibrary(
        [makePhoto({ slug: "cover", collections: [] })],
        [makeCollection({ slug: "coastline", coverPhotoSlug: "cover" })],
      ),
    ).toThrow(/contains no photos/);
  });

  it("throws ContentValidationError so the build failure is recognisable", () => {
    expect(() =>
      buildLibrary(
        [makePhoto({ slug: "twice" }), makePhoto({ slug: "twice" })],
        [makeCollection({ coverPhotoSlug: "twice" })],
      ),
    ).toThrow(ContentValidationError);
  });

  it("indexes photos and collections by slug for lookup", () => {
    const library = buildLibrary(
      [makePhoto({ slug: "cover", collections: ["coastline"] })],
      [makeCollection({ slug: "coastline", coverPhotoSlug: "cover" })],
    );

    expect(library.photosBySlug.get("cover")?.title).toBe("Harbour at dawn");
    expect(library.collectionsBySlug.get("coastline")?.title).toBe("Coastline");
    expect(library.photosBySlug.get("nope")).toBeUndefined();
  });
});

describe("sortHomeFeed", () => {
  it("promotes featured photos ahead of the rest", () => {
    const feed = sortHomeFeed([
      makePhoto({ slug: "recent-but-ordinary", featured: false }),
      makePhoto({ slug: "old-but-strong", featured: true }),
    ]);

    expect(feed.map((photo) => photo.slug)).toEqual([
      "old-but-strong",
      "recent-but-ordinary",
    ]);
  });

  it("preserves the incoming order within each group", () => {
    const feed = sortHomeFeed([
      makePhoto({ slug: "featured-first", featured: true }),
      makePhoto({ slug: "featured-second", featured: true }),
      makePhoto({ slug: "rest-first", featured: false }),
    ]);

    expect(feed.map((photo) => photo.slug)).toEqual([
      "featured-first",
      "featured-second",
      "rest-first",
    ]);
  });
});
