import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  extractExif,
  formatCamera,
  formatShutter,
  parseExifTimestamp,
} from "./exif";

describe("formatCamera", () => {
  it("joins make and model", () => {
    expect(formatCamera("Fujifilm", "X-T30")).toBe("Fujifilm X-T30");
  });

  // Cameras commonly write Make "NIKON CORPORATION" and Model "NIKON Z6", which naively
  // concatenated reads "NIKON CORPORATION NIKON Z6".
  it("does not repeat the brand when the model already carries it", () => {
    expect(formatCamera("NIKON CORPORATION", "NIKON Z6")).toBe("NIKON Z6");
  });

  it("handles either half being missing", () => {
    expect(formatCamera(undefined, "X-T30")).toBe("X-T30");
    expect(formatCamera("Fujifilm", undefined)).toBe("Fujifilm");
    expect(formatCamera(undefined, undefined)).toBeNull();
    expect(formatCamera("  ", "  ")).toBeNull();
  });
});

describe("formatShutter", () => {
  it("renders fast shutter speeds as a fraction", () => {
    expect(formatShutter(0.004)).toBe("1/250");
    expect(formatShutter(1 / 8000)).toBe("1/8000");
  });

  it("renders long exposures in seconds", () => {
    expect(formatShutter(2)).toBe("2s");
    expect(formatShutter(1)).toBe("1s");
    expect(formatShutter(2.5)).toBe("2.5s");
  });

  it("returns null for missing or nonsensical values", () => {
    expect(formatShutter(undefined)).toBeNull();
    expect(formatShutter(0)).toBeNull();
    expect(formatShutter(-1)).toBeNull();
  });
});

describe("parseExifTimestamp", () => {
  /**
   * The important one. EXIF timestamps carry no timezone, and exifr's default is to read
   * them in the *ingesting machine's* timezone -- so a 06:12 dawn frame ingested in India
   * becomes 00:42Z and renders as the previous night. The wall-clock time the camera
   * recorded is the only meaningful reading, so it must survive untouched.
   */
  it("preserves the wall-clock time rather than shifting it by a timezone", () => {
    expect(parseExifTimestamp("2025:01:15 06:12:00")).toBe(
      "2025-01-15T06:12:00.000Z",
    );
  });

  it("accepts a T separator as well as a space", () => {
    expect(parseExifTimestamp("2025:01:15T06:12:00")).toBe(
      "2025-01-15T06:12:00.000Z",
    );
  });

  it("returns null for absent or unparseable values", () => {
    expect(parseExifTimestamp(undefined)).toBeNull();
    expect(parseExifTimestamp("")).toBeNull();
    expect(parseExifTimestamp("not a date")).toBeNull();
    expect(parseExifTimestamp("0000:00:00 00:00:00")).toBeNull();
  });
});

/** Builds a real JPEG so extraction is tested against actual bytes, not a mock. */
async function jpegWithExif(): Promise<Buffer> {
  return sharp({
    create: {
      width: 60,
      height: 40,
      channels: 3,
      background: { r: 20, g: 40, b: 80 },
    },
  })
    .withExif({
      IFD0: { Make: "FUJIFILM", Model: "X-T30" },
      IFD2: {
        DateTimeOriginal: "2025:01:15 06:12:00",
        FNumber: "2.8",
        ExposureTime: "0.004",
        ISOSpeedRatings: "200",
        FocalLength: "23",
        LensModel: "XF23mmF2 R WR",
      },
    })
    .jpeg()
    .toBuffer();
}

describe("extractExif", () => {
  it("reads shooting data out of a real file", async () => {
    const { exif, capturedAt } = await extractExif(await jpegWithExif());

    expect(exif.camera).toBe("FUJIFILM X-T30");
    expect(exif.lens).toBe("XF23mmF2 R WR");
    expect(exif.aperture).toBe(2.8);
    expect(exif.shutter).toBe("1/250");
    expect(exif.iso).toBe(200);
    expect(exif.focalLength).toBe(23);
    expect(capturedAt).toBe("2025-01-15T06:12:00.000Z");
  });

  // A stripped export or a screenshot has no EXIF block at all. It should still publish,
  // just without shooting notes -- not crash the ingest run.
  it("degrades to empty fields when the file carries no EXIF", async () => {
    const bare = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#000" },
    })
      .jpeg()
      .toBuffer();

    const { exif, capturedAt } = await extractExif(bare);

    expect(capturedAt).toBeNull();
    expect(exif).toEqual({
      camera: null,
      lens: null,
      focalLength: null,
      aperture: null,
      shutter: null,
      iso: null,
    });
  });

  it("does not throw on data that is not an image at all", async () => {
    const { exif } = await extractExif(Buffer.from("this is not an image"));
    expect(exif.camera).toBeNull();
  });
});
