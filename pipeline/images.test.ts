import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { orientedDimensions, planWidths, processImage } from "./images";

describe("orientedDimensions", () => {
  it.each([undefined, 1, 2, 3, 4])(
    "leaves dimensions alone for orientation %s",
    (orientation) => {
      expect(orientedDimensions(1000, 500, orientation)).toEqual({
        width: 1000,
        height: 500,
      });
    },
  );

  it.each([5, 6, 7, 8])(
    "swaps dimensions for quarter-turned orientation %s",
    (orientation) => {
      expect(orientedDimensions(1000, 500, orientation)).toEqual({
        width: 500,
        height: 1000,
      });
    },
  );
});

describe("planWidths", () => {
  it("uses every target width for a large original", () => {
    expect(planWidths(6000)).toEqual([400, 800, 1200, 1600, 2400]);
  });

  // Upscaling produces a larger file carrying no more detail, and a srcset entry that
  // lies about what the browser is getting.
  it("never plans a width larger than the original", () => {
    expect(planWidths(1000).every((width) => width <= 1000)).toBe(true);
  });

  it("includes the original width so the sharpest version is still offered", () => {
    expect(planWidths(1000)).toEqual([400, 800, 1000]);
  });

  it("handles an original smaller than every target", () => {
    expect(planWidths(300)).toEqual([300]);
  });

  it("does not duplicate a width that exactly matches a target", () => {
    const widths = planWidths(800);
    expect(new Set(widths).size).toBe(widths.length);
    expect(widths).toEqual([400, 800]);
  });
});

describe("processImage", () => {
  it("produces both formats at every planned width", async () => {
    const original = await sharp({
      create: {
        width: 1000,
        height: 500,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processImage(original);

    expect(result.width).toBe(1000);
    expect(result.height).toBe(500);
    // 3 planned widths x 2 formats.
    expect(result.derivatives).toHaveLength(6);
    expect(result.derivatives.filter((d) => d.format === "avif")).toHaveLength(
      3,
    );
    expect(result.derivatives.filter((d) => d.format === "webp")).toHaveLength(
      3,
    );
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  /**
   * A portrait frame shot on a rotated body records landscape pixel dimensions plus an
   * orientation tag. If the tag is not applied, the image serves sideways *and* the
   * recorded width/height describe the wrong shape -- so the page reserves the wrong space
   * and shifts on load, which is exactly the layout shift these dimensions exist to stop.
   */
  it("applies EXIF orientation so recorded dimensions match what is served", async () => {
    const rotated = await sharp({
      create: {
        width: 1000,
        height: 500,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      // Orientation 6 means "rotate 90 degrees clockwise to display".
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await processImage(rotated);

    expect(result.width).toBe(500);
    expect(result.height).toBe(1000);

    // The claim that matters is not just that the numbers swapped, but that they describe
    // the bytes actually being served -- so decode a derivative and compare.
    const derivative = result.derivatives.find(
      (d) => d.format === "webp" && d.width === 400,
    );
    const decoded = await sharp(derivative?.data).metadata();
    expect(decoded.width).toBe(400);
    expect(decoded.height).toBe(800);
  });

  it("keeps the blur placeholder small enough to inline", async () => {
    const original = await sharp({
      create: {
        width: 2000,
        height: 1300,
        channels: 3,
        background: { r: 90, g: 60, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    const { blurDataUrl } = await processImage(original);

    // A few hundred bytes is fine in the HTML; a few kilobytes per photo is not.
    expect(blurDataUrl.length).toBeLessThan(2000);
  });

  it("rejects input that is not an image", async () => {
    await expect(processImage(Buffer.from("nope"))).rejects.toThrow();
  });
});
