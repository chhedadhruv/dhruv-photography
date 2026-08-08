import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExifPanel } from "@/components/ExifPanel";
import { FullFrame } from "@/components/FullFrame";
import { JsonLd } from "@/components/JsonLd";
import { PhotoImage } from "@/components/PhotoImage";
import { RebateRail } from "@/components/RebateStrip";
import {
  breadcrumbJsonLd,
  graph,
  imageObjectJsonLd,
  personJsonLd,
} from "@/lib/jsonld";
import {
  getAllPhotos,
  getCollectionBySlug,
  getPhotoBySlug,
} from "@/lib/photos";
import { absoluteImageUrl } from "@/lib/seo";
import { siteConfig } from "@/site.config";

/**
 * Every photo is prerendered at build time. `generateStaticParams` is what keeps these
 * routes static -- without it they would render per request, which for a site whose
 * content only changes when you push would be cost with no benefit.
 */
export function generateStaticParams(): { slug: string }[] {
  return getAllPhotos().map((photo) => ({ slug: photo.slug }));
}

export async function generateMetadata(
  props: PageProps<"/photos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const photo = getPhotoBySlug(slug);

  if (photo === undefined) {
    return {};
  }

  // Location goes in the title where there is one: "shoot locations" is a stated search
  // goal, and the title is the strongest field for it.
  const title =
    photo.location === null
      ? photo.title
      : `${photo.title} — ${photo.location}`;

  return {
    title,
    description: photo.caption,
    alternates: { canonical: `/photos/${photo.slug}` },
    openGraph: {
      title,
      description: photo.caption,
      type: "article",
      images: [
        {
          url: absoluteImageUrl(photo),
          width: photo.width,
          height: photo.height,
          alt: photo.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [absoluteImageUrl(photo)],
    },
  };
}

export default async function PhotoPage(props: PageProps<"/photos/[slug]">) {
  const { slug } = await props.params;
  const photo = getPhotoBySlug(slug);

  if (photo === undefined) {
    notFound();
  }

  const collections = photo.collections
    .map((collectionSlug) => getCollectionBySlug(collectionSlug))
    .filter((collection) => collection !== undefined);

  return (
    <article className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      {/* The ImageObject is the whole point of giving each photo its own URL: it states
          outright that this page is a photograph, who made it, and where it was taken. */}
      <JsonLd
        data={graph([
          imageObjectJsonLd(photo),
          personJsonLd(),
          breadcrumbJsonLd([
            { name: "Frames", path: "/" },
            { name: photo.title, path: `/photos/${photo.slug}` },
          ]),
        ])}
      />

      <div className="flex gap-6">
        <RebateRail photo={photo} />

        <div className="min-w-0 flex-1">
          <FullFrame label={photo.title}>
            <PhotoImage
              photo={photo}
              sizes="(min-width: 1600px) 90rem, 100vw"
              priority
            />
          </FullFrame>
        </div>
      </div>

      <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h1 className="font-display text-paper text-3xl leading-tight font-light md:text-4xl">
            {photo.title}
          </h1>

          <p className="text-paper/85 mt-5 max-w-2xl text-lg leading-relaxed">
            {photo.caption}
          </p>

          {collections.length > 0 && (
            <nav aria-label="Collections" className="mt-10">
              <h2 className="rebate text-selenium">Appears in</h2>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {collections.map((collection) => (
                  <li key={collection.slug}>
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="font-display hover:text-selenium text-lg font-light transition-colors"
                    >
                      {collection.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <p className="rebate mt-12 normal-case">{siteConfig.copyright}</p>
        </div>

        <ExifPanel photo={photo} />
      </div>
    </article>
  );
}
