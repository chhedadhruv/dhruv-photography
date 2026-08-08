import { buildSrcSet, largestDerivativeUrl } from "@/lib/images";
import type { Photo } from "@/lib/schema";

interface PhotoImageProps {
  readonly photo: Photo;
  /** The `sizes` attribute. Wrong values here waste bandwidth silently, so it is required. */
  readonly sizes: string;
  /**
   * Set on the one image most likely to be the Largest Contentful Paint -- the lead frame
   * or a photo page's hero. It loads eagerly and at high priority; everything else stays
   * lazy. Marking several images priority defeats the point, since the browser then has no
   * idea which one actually matters.
   */
  readonly priority?: boolean;
  readonly className?: string;
}

/**
 * A plain `<img>`, deliberately.
 *
 * The ingest pipeline already produced AVIF and WebP at fixed widths, so `next/image`
 * would re-optimize optimized files, need `remotePatterns` configured for R2, and bill
 * per transform for work already done. `<picture>` gives the browser the format choice,
 * `srcset` gives it the width choice, and `width`/`height` from `photos.json` reserve the
 * right space so nothing shifts on load.
 */
export function PhotoImage({
  photo,
  sizes,
  priority = false,
  className = "",
}: PhotoImageProps) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={buildSrcSet(photo, "avif")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={buildSrcSet(photo, "webp")}
        sizes={sizes}
      />
      <img
        src={largestDerivativeUrl(photo)}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        // The pipeline's placeholder sits behind the image, so the frame's colours are
        // there from the first paint rather than a hole in the page.
        style={{ backgroundImage: `url(${photo.blurDataUrl})` }}
        className={`blur-up h-auto w-full ${className}`}
      />
    </picture>
  );
}
