import { describe, expect, it } from "vitest";

import { makeCollection, makePhoto } from "./test-fixtures";
import {
  ContentValidationError,
  collectionSchema,
  journalFrontmatterSchema,
  parseContent,
  photoSchema,
} from "./schema";

describe("photoSchema", () => {
  it("accepts a well-formed photo", () => {
    expect(photoSchema.safeParse(makePhoto()).success).toBe(true);
  });

  // Alt text is the accessibility contract and the main Google Images signal, so its
  // absence has to be a build failure rather than a lint-level nag.
  it("rejects a photo with no alt text", () => {
    expect(photoSchema.safeParse(makePhoto({ alt: "" })).success).toBe(false);
  });

  it("rejects alt text too short to describe anything", () => {
    expect(photoSchema.safeParse(makePhoto({ alt: "boats" })).success).toBe(
      false,
    );
  });

  it("rejects a photo with no caption", () => {
    expect(photoSchema.safeParse(makePhoto({ caption: "" })).success).toBe(
      false,
    );
  });

  it.each([
    ["uppercase", "Harbour-At-Dawn"],
    ["spaces", "harbour at dawn"],
    ["underscores", "harbour_at_dawn"],
    ["double hyphens", "harbour--dawn"],
    ["trailing hyphen", "harbour-"],
  ])("rejects a slug containing %s", (_label, slug) => {
    expect(photoSchema.safeParse(makePhoto({ slug })).success).toBe(false);
  });

  it("accepts a null capture date, because not every file carries one", () => {
    expect(photoSchema.safeParse(makePhoto({ capturedAt: null })).success).toBe(
      true,
    );
  });

  it("rejects a capture date that is not ISO 8601", () => {
    expect(
      photoSchema.safeParse(makePhoto({ capturedAt: "15/01/2025" })).success,
    ).toBe(false);
  });

  it("rejects dimensions that are not positive integers", () => {
    expect(photoSchema.safeParse(makePhoto({ width: 0 })).success).toBe(false);
    expect(photoSchema.safeParse(makePhoto({ height: -1 })).success).toBe(
      false,
    );
  });

  // A srcset built from an empty width list would reference nothing.
  it("rejects a photo with no derivative widths", () => {
    expect(
      photoSchema.safeParse(makePhoto({ derivativeWidths: [] })).success,
    ).toBe(false);
  });

  it("rejects a blur placeholder that is not a data URI", () => {
    expect(
      photoSchema.safeParse(
        makePhoto({ blurDataUrl: "https://example.com/blur.webp" }),
      ).success,
    ).toBe(false);
  });

  it("accepts EXIF fields that are individually missing", () => {
    const result = photoSchema.safeParse(
      makePhoto({
        exif: {
          camera: null,
          lens: null,
          focalLength: null,
          aperture: null,
          shutter: null,
          iso: null,
        },
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("collectionSchema", () => {
  it("accepts a well-formed collection", () => {
    expect(collectionSchema.safeParse(makeCollection()).success).toBe(true);
  });

  it("rejects a description too short to serve as a meta description", () => {
    expect(
      collectionSchema.safeParse(makeCollection({ description: "Beaches." }))
        .success,
    ).toBe(false);
  });
});

describe("journalFrontmatterSchema", () => {
  const valid = {
    title: "Three mornings on the Konkan coast",
    description:
      "Notes from a week of getting up before sunrise, and what it taught me about waiting.",
    publishedAt: "2025-02-01",
    tags: ["travel", "landscape"],
  };

  it("defaults draft to false when unspecified", () => {
    const result = journalFrontmatterSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.success && result.data.draft).toBe(false);
  });

  it("rejects a datetime where a date is expected", () => {
    expect(
      journalFrontmatterSchema.safeParse({
        ...valid,
        publishedAt: "2025-02-01T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("parseContent", () => {
  it("returns typed data when valid", () => {
    const photo = parseContent(photoSchema, makePhoto(), "fixture.json");
    expect(photo.slug).toBe("harbour-at-dawn");
  });

  // A build failure is only useful if it says which file to open and what is wrong with
  // it, so both are asserted rather than just the fact that it threw.
  it("throws an error naming the source file and the offending field", () => {
    const parseBadPhoto = (): unknown =>
      parseContent(photoSchema, makePhoto({ alt: "" }), "content/photos.json");

    expect(parseBadPhoto).toThrow(ContentValidationError);
    expect(parseBadPhoto).toThrow(/content\/photos\.json/);
    expect(parseBadPhoto).toThrow(/alt/);
  });
});
