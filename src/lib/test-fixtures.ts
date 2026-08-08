import type { Collection, Photo } from "./schema";

/**
 * Fixture builders for tests.
 *
 * They return valid content by default and take an override patch, so each test states
 * only the field it actually cares about. A test that says `makePhoto({ alt: "" })` reads
 * as its own assertion; one that spells out fifteen unrelated fields does not.
 */

export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    slug: "harbour-at-dawn",
    sourceFile: "DSCF1234.jpg",
    title: "Harbour at dawn",
    alt: "Fishing boats moored in a still harbour under a pale morning sky",
    caption: "The fleet comes back in before the light gets hard.",
    location: "Vasai, Maharashtra",
    capturedAt: "2025-01-15T06:12:00.000Z",
    collections: [],
    featured: false,
    width: 4000,
    height: 2667,
    derivativeWidths: [400, 800, 1200],
    blurDataUrl: "data:image/webp;base64,UklGRg==",
    exif: {
      camera: "Fujifilm X-T30",
      lens: "XF 23mm f/2 R WR",
      focalLength: 23,
      aperture: 2,
      shutter: "1/250",
      iso: 200,
    },
    ...overrides,
  };
}

export function makeCollection(
  overrides: Partial<Collection> = {},
): Collection {
  return {
    slug: "coastline",
    title: "Coastline",
    description:
      "Mornings and evenings along the Maharashtra coast, mostly at the edges of the day.",
    location: "Maharashtra, India",
    coverPhotoSlug: "harbour-at-dawn",
    order: 0,
    ...overrides,
  };
}
