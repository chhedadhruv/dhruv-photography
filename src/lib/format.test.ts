import { describe, expect, it } from "vitest";

import {
  dateline,
  exifSummary,
  formatCaptureDate,
  formatPostDate,
  frameIndex,
  hasExif,
} from "./format";
import { makePhoto } from "./test-fixtures";

const NO_EXIF = {
  camera: null,
  lens: null,
  focalLength: null,
  aperture: null,
  shutter: null,
  iso: null,
};

describe("formatCaptureDate", () => {
  /**
   * The pipeline stores a wall-clock reading labelled UTC so it survives ingest unshifted.
   * Formatting it in the viewer's local timezone would reintroduce exactly the shift the
   * pipeline exists to avoid -- a frame taken just after midnight would show the previous
   * day for anyone west of UTC.
   */
  it("reads the stored timestamp as UTC rather than local time", () => {
    expect(formatCaptureDate("2025-01-15T00:30:00.000Z")).toBe(
      "15 January 2025",
    );
    expect(formatCaptureDate("2025-01-15T23:30:00.000Z")).toBe(
      "15 January 2025",
    );
  });

  it("returns null when the file carried no date", () => {
    expect(formatCaptureDate(null)).toBeNull();
  });
});

describe("formatPostDate", () => {
  // A date-only string parsed as local time lands on the previous day in western zones.
  it("does not slip a day", () => {
    expect(formatPostDate("2025-02-10")).toBe("10 February 2025");
    expect(formatPostDate("2025-01-01")).toBe("1 January 2025");
  });
});

describe("exifSummary", () => {
  it("orders the values the way a photographer reads them", () => {
    expect(
      exifSummary({
        camera: "Canon EOS R50",
        lens: "RF-S18-45mm F4.5-6.3 IS STM",
        focalLength: 35,
        aperture: 6.3,
        shutter: "1/50",
        iso: 3200,
      }),
    ).toEqual(["35mm", "f/6.3", "1/50", "ISO 3200"]);
  });

  // A gap says "unknown" more honestly than a dash, which says "we tried".
  it("drops missing values rather than rendering placeholders", () => {
    expect(exifSummary({ ...NO_EXIF, focalLength: 18, iso: 200 })).toEqual([
      "18mm",
      "ISO 200",
    ]);
  });

  it("returns nothing when there is no shooting data at all", () => {
    expect(exifSummary(NO_EXIF)).toEqual([]);
  });
});

describe("hasExif", () => {
  it("is false only when every field is absent", () => {
    expect(hasExif(NO_EXIF)).toBe(false);
    expect(hasExif({ ...NO_EXIF, camera: "Canon EOS R50" })).toBe(true);
    expect(hasExif({ ...NO_EXIF, iso: 200 })).toBe(true);
  });
});

describe("frameIndex", () => {
  // Zero-padded like a film frame counter, and one-based because the first frame is 01.
  it("pads to two digits and counts from one", () => {
    expect(frameIndex(0)).toBe("01");
    expect(frameIndex(8)).toBe("09");
  });

  it("does not truncate past ninety-nine", () => {
    expect(frameIndex(99)).toBe("100");
  });
});

describe("dateline", () => {
  it("joins location and date", () => {
    expect(
      dateline(
        makePhoto({
          location: "Vasai, Maharashtra",
          capturedAt: "2025-01-15T06:12:00.000Z",
        }),
      ),
    ).toBe("Vasai, Maharashtra · 15 January 2025");
  });

  it("omits whichever half is missing without a stray separator", () => {
    expect(dateline(makePhoto({ location: null }))).toBe("15 January 2025");
    expect(dateline(makePhoto({ capturedAt: null }))).toBe(
      "Vasai, Maharashtra",
    );
  });

  it("returns null when neither is known", () => {
    expect(
      dateline(makePhoto({ location: null, capturedAt: null })),
    ).toBeNull();
  });
});
