import Link from "next/link";

import type { Photo } from "@/lib/schema";

import { PhotoImage } from "./PhotoImage";
import { RebateStrip } from "./RebateStrip";

interface PhotoGridProps {
  readonly photos: readonly Photo[];
  /** Continues the frame numbering when a lead frame sits above the grid. */
  readonly startIndex?: number;
}

/**
 * Two wide columns rather than a dense many-column grid: the photographs are the point,
 * and at three or four across they stop being photographs and become thumbnails.
 *
 * Items are top-aligned and keep their true aspect ratios, so portrait and landscape
 * frames sit at different heights. That ragged bottom edge is the shape of the work
 * itself; forcing every frame into a uniform square would be a lie about what was shot.
 * A masonry layout would close the gaps but scramble reading order, and the feed is
 * chronological -- order is information here.
 */
export function PhotoGrid({ photos, startIndex = 0 }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <p className="rebate py-24 text-center normal-case">
        No photographs here yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 items-start gap-x-10 gap-y-16 md:grid-cols-2">
      {photos.map((photo, offset) => (
        <li key={photo.slug}>
          <Link href={`/photos/${photo.slug}`} className="group block">
            <div className="overflow-hidden">
              <PhotoImage
                photo={photo}
                sizes="(min-width: 768px) 46vw, 92vw"
                className="transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </div>

            <h2 className="font-display text-paper group-hover:text-selenium mt-4 text-xl leading-snug font-light transition-colors">
              {photo.title}
            </h2>

            <RebateStrip photo={photo} index={startIndex + offset} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
