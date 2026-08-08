import { formatCaptureDate } from "@/lib/format";
import type { Photo } from "@/lib/schema";

interface Row {
  readonly term: string;
  readonly value: string | null;
}

/**
 * The full shooting record, as a description list.
 *
 * A real `<dl>` rather than a styled table: these are term/value pairs, screen readers
 * announce them as such, and the text sits in the markup where search engines can read it.
 * That last part is why this panel is worth having at all -- it is the only substantial
 * text on a photo page besides the caption.
 *
 * Rows with no value are dropped. A field showing "--" tells a visitor nothing except that
 * the site tried.
 */
export function ExifPanel({ photo }: { readonly photo: Photo }) {
  const { exif } = photo;

  const candidates: readonly Row[] = [
    { term: "Location", value: photo.location },
    { term: "Taken", value: formatCaptureDate(photo.capturedAt) },
    { term: "Camera", value: exif.camera },
    { term: "Lens", value: exif.lens },
    {
      term: "Focal length",
      value: exif.focalLength === null ? null : `${String(exif.focalLength)}mm`,
    },
    {
      term: "Aperture",
      value: exif.aperture === null ? null : `f/${String(exif.aperture)}`,
    },
    { term: "Shutter", value: exif.shutter },
    { term: "ISO", value: exif.iso === null ? null : String(exif.iso) },
  ];

  const rows = candidates.filter(
    (row): row is Row & { value: string } => row.value !== null,
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="shooting-notes">
      <h2 id="shooting-notes" className="rebate text-selenium">
        Shooting notes
      </h2>

      <dl className="border-rule mt-4 border-t">
        {rows.map((row) => (
          <div
            key={row.term}
            className="border-rule flex items-baseline justify-between gap-6 border-b py-2.5"
          >
            <dt className="rebate">{row.term}</dt>
            <dd className="font-data text-paper text-right text-sm tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
