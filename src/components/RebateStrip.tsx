import { dateline, exifSummary, frameIndex } from "@/lib/format";
import type { Photo } from "@/lib/schema";

interface RebateStripProps {
  readonly photo: Photo;
  /** Position in the sequence, if this photo is part of an ordered feed. */
  readonly index?: number;
}

/**
 * The signature element: a photograph's edge printing.
 *
 * On a strip of film the manufacturer prints the stock and the frame numbers along the
 * rebate -- the margin outside the image area. This is that, for the web: frame index,
 * then the shooting data in the order a photographer reads it.
 *
 * It is structure carrying information rather than ornament. The index is the frame's real
 * position in a chronological feed, and the EXIF is the data itself; both are plain text in
 * the markup, which is what makes them useful to the photographer audience and to search
 * engines at the same time.
 */
export function RebateStrip({ photo, index }: RebateStripProps) {
  const parts = exifSummary(photo.exif);
  const place = dateline(photo);

  return (
    <div className="border-rule flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-2.5">
      {index !== undefined && (
        <span className="rebate text-selenium">{frameIndex(index)}</span>
      )}

      {place !== null && <span className="rebate">{place}</span>}

      {parts.length > 0 && (
        <span className="rebate ml-auto">{parts.join(" · ")}</span>
      )}
    </div>
  );
}

/**
 * The vertical form, for photo pages.
 *
 * Rotated so it runs up the edge of the frame the way edge printing actually sits on a
 * negative. Hidden below large screens, where there is no margin to put it in -- the
 * horizontal strip carries the same information there, so nothing is lost.
 */
export function RebateRail({ photo }: { readonly photo: Photo }) {
  const parts = [photo.exif.camera, photo.exif.lens, ...exifSummary(photo.exif)]
    .filter((part): part is string => part !== null)
    .join("   ·   ");

  if (parts === "") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="hidden lg:flex lg:w-8 lg:shrink-0 lg:justify-center"
    >
      <span
        className="rebate whitespace-nowrap"
        style={{ writingMode: "vertical-rl", rotate: "180deg" }}
      >
        {parts}
      </span>
    </div>
  );
}
