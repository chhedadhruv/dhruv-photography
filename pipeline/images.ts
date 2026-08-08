import sharp, { type Sharp } from "sharp";

import { IMAGE_FORMATS, TARGET_WIDTHS, type ImageFormat } from "@/lib/images";

/**
 * Derivative generation.
 *
 * All the image work happens here, once, on your machine -- which is what lets the site
 * serve plain `<img>` tags with no runtime image service behind them.
 */

export interface Derivative {
  readonly width: number;
  readonly format: ImageFormat;
  readonly data: Buffer;
}

export interface ProcessedImage {
  /** Dimensions after EXIF rotation is applied, which is what the browser will see. */
  readonly width: number;
  readonly height: number;
  readonly derivatives: readonly Derivative[];
  readonly blurDataUrl: string;
}

/**
 * Widths to generate for an original of the given width.
 *
 * Never upscales: a derivative wider than the original would be a bigger file carrying no
 * extra detail. When the original is smaller than the largest target, its native width is
 * included so the sharpest available version is still offered.
 */
export function planWidths(originalWidth: number): readonly number[] {
  const largestTarget = TARGET_WIDTHS[TARGET_WIDTHS.length - 1] ?? 2400;

  if (originalWidth >= largestTarget) {
    return [...TARGET_WIDTHS];
  }

  const smaller = TARGET_WIDTHS.filter((width) => width < originalWidth);
  return [...smaller, originalWidth];
}

/**
 * Dimensions as they will actually be served, after EXIF orientation is applied.
 *
 * sharp's `.metadata()` always reports the *stored* pixel dimensions, even on a pipeline
 * with `.rotate()` on it -- verified: a portrait frame stored as 1000x500 with orientation
 * 6 still reports 1000x500, while the encoded output comes out 500x1000. Recording the
 * stored dimensions would make every rotated photo reserve space in the wrong shape and
 * shift the page on load, which is the exact failure these numbers exist to prevent.
 *
 * Orientation values 5 through 8 are the ones involving a quarter turn.
 */
export function orientedDimensions(
  width: number,
  height: number,
  orientation: number | undefined,
): { width: number; height: number } {
  const quarterTurned =
    orientation !== undefined && orientation >= 5 && orientation <= 8;

  return quarterTurned ? { width: height, height: width } : { width, height };
}

/**
 * A ~20px wide blurred WebP, inlined as a data URI.
 *
 * Small enough to sit in the HTML without bloating it, and it gives the visitor something
 * in the right colours immediately -- which matters most on a photo site, where the real
 * image is the largest thing on the page.
 */
async function generateBlurPlaceholder(pipeline: Sharp): Promise<string> {
  const buffer = await pipeline
    .clone()
    .resize({ width: 20 })
    .webp({ quality: 40 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

function encode(
  pipeline: Sharp,
  width: number,
  format: ImageFormat,
): Promise<Buffer> {
  const resized = pipeline.clone().resize({ width, withoutEnlargement: true });

  // Quality settings differ by codec: AVIF holds up at a lower number than WebP, which is
  // most of why it wins on file size.
  return format === "avif"
    ? resized.avif({ quality: 55 }).toBuffer()
    : resized.webp({ quality: 78 }).toBuffer();
}

/**
 * Decodes an original and produces every derivative plus a blur placeholder.
 *
 * `.rotate()` with no argument applies the EXIF orientation tag and then strips it. Without
 * it, a portrait frame shot on a rotated body would be served sideways -- and the width and
 * height recorded here would describe the unrotated file, so the page would reserve space
 * in the wrong shape and shift on load.
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(buffer).rotate();
  const metadata = await pipeline.metadata();

  // sharp types width and height as always present, and `.metadata()` rejects outright for
  // anything it cannot decode -- so an unreadable file fails here rather than silently
  // producing a photo with no dimensions.
  const { width, height } = orientedDimensions(
    metadata.width,
    metadata.height,
    metadata.orientation,
  );

  const widths = planWidths(width);

  // Sequential rather than parallel: encoding is already multi-threaded inside sharp, and
  // running every width and format at once on a large library exhausts memory.
  const derivatives: Derivative[] = [];
  for (const targetWidth of widths) {
    for (const format of IMAGE_FORMATS) {
      derivatives.push({
        width: targetWidth,
        format,
        data: await encode(pipeline, targetWidth, format),
      });
    }
  }

  return {
    width,
    height,
    derivatives,
    blurDataUrl: await generateBlurPlaceholder(pipeline),
  };
}
