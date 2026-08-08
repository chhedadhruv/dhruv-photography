import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoImage } from "@/components/PhotoImage";
import { RebateStrip } from "@/components/RebateStrip";
import { graph, personJsonLd, webSiteJsonLd } from "@/lib/jsonld";
import { getHomeFeedPhotos } from "@/lib/photos";
import { absoluteImageUrl } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export function generateMetadata(): Metadata {
  const lead = getHomeFeedPhotos()[0];

  return {
    alternates: { canonical: "/" },
    openGraph: {
      title: `${siteConfig.shortName} — ${siteConfig.tagline}`,
      description: siteConfig.description,
      type: "website",
      url: siteConfig.url,
      ...(lead === undefined ? {} : { images: [absoluteImageUrl(lead)] }),
    },
    twitter: {
      // A photography site's card should be the photograph, not a cropped thumbnail.
      card: "summary_large_image",
      ...(lead === undefined ? {} : { images: [absoluteImageUrl(lead)] }),
    },
  };
}

/**
 * The home page opens with a single photograph at full width rather than a headline over
 * a hero image.
 *
 * A photographer's thesis is a frame, not a sentence. The lead is whichever photo is
 * marked featured and most recent, presented at the size it deserves, with its edge
 * printing underneath. The feed follows.
 */
export default function HomePage() {
  const photos = getHomeFeedPhotos();
  const [lead, ...rest] = photos;

  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      {/* Declares the site and its author once, with stable @ids the other pages
          reference, so search engines treat every page as the work of one person. */}
      <JsonLd data={graph([webSiteJsonLd(), personJsonLd()])} />

      {lead === undefined ? (
        <p className="rebate py-32 text-center normal-case">
          No photographs published yet.
        </p>
      ) : (
        <>
          <section>
            <Link href={`/photos/${lead.slug}`} className="group block">
              <PhotoImage
                photo={lead}
                sizes="(min-width: 1600px) 100rem, 100vw"
                priority
              />
              <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                <h1 className="font-display text-paper group-hover:text-selenium max-w-3xl text-3xl leading-tight font-light transition-colors md:text-5xl">
                  {lead.title}
                </h1>
                <p className="text-dim max-w-md text-sm leading-relaxed">
                  {lead.caption}
                </p>
              </div>
              <RebateStrip photo={lead} index={0} />
            </Link>
          </section>

          <section className="mt-28">
            <h2 className="rebate text-selenium border-rule border-b pb-3">
              {siteConfig.tagline}
            </h2>
            <div className="mt-12">
              <PhotoGrid photos={rest} startIndex={1} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
