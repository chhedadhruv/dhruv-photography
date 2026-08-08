import { describe, expect, it } from "vitest";

import {
  aspectRatio,
  buildSrcSet,
  derivativeKey,
  derivativeUrl,
  isLandscape,
  largestDerivativeUrl,
} from "./images";
import { makePhoto } from "./test-fixtures";

/**
 * The pipeline writes to `derivativeKey` and the site reads from `derivativeUrl`. If those
 * two ever disagree, every image 404s -- so the key format is pinned by a test rather than
 * left to whoever edits it next.
 */

describe("derivativeKey", () => {
  it("builds a stable, predictable storage key", () => {
    expect(derivativeKey("harbour-at-dawn", 800, "avif")).toBe(
      "photos/harbour-at-dawn/800.avif",
    );
  });
});

describe("derivativeUrl", () => {
  it("resolves against the configured image origin", () => {
    expect(derivativeUrl("harbour-at-dawn", 800, "webp")).toBe(
      "/images/photos/harbour-at-dawn/800.webp",
    );
  });
});

describe("buildSrcSet", () => {
  it("lists every available width with its descriptor", () => {
    const photo = makePhoto({ derivativeWidths: [400, 800] });

    expect(buildSrcSet(photo, "avif")).toBe(
      "/images/photos/harbour-at-dawn/400.avif 400w, " +
        "/images/photos/harbour-at-dawn/800.avif 800w",
    );
  });

  // The pipeline never upscales, so a small original has fewer derivatives. Advertising a
  // width that was never generated would 404 for exactly the widest screens.
  it("never advertises a width the photo does not have", () => {
    const photo = makePhoto({ derivativeWidths: [400] });
    expect(buildSrcSet(photo, "webp")).not.toContain("2400");
  });
});

describe("largestDerivativeUrl", () => {
  it("picks the widest available derivative as the fallback src", () => {
    const photo = makePhoto({ derivativeWidths: [400, 1600, 800] });
    expect(largestDerivativeUrl(photo)).toBe(
      "/images/photos/harbour-at-dawn/1600.webp",
    );
  });
});

describe("orientation helpers", () => {
  it("computes aspect ratio from the stored dimensions", () => {
    expect(aspectRatio(makePhoto({ width: 3000, height: 2000 }))).toBe(1.5);
  });

  it("classifies portrait and landscape", () => {
    expect(isLandscape(makePhoto({ width: 3000, height: 2000 }))).toBe(true);
    expect(isLandscape(makePhoto({ width: 2000, height: 3000 }))).toBe(false);
    // A square frame is treated as landscape so grid layout has no undefined case.
    expect(isLandscape(makePhoto({ width: 2000, height: 2000 }))).toBe(true);
  });
});
