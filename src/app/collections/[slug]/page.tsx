import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { PhotoGrid } from "@/components/PhotoGrid";
import {
  breadcrumbJsonLd,
  graph,
  imageGalleryJsonLd,
  personJsonLd,
} from "@/lib/jsonld";
import {
  getAllCollections,
  getCollectionBySlug,
  getCoverPhoto,
  getPhotosInCollection,
} from "@/lib/photos";
import { absoluteImageUrl } from "@/lib/seo";

export function generateStaticParams(): { slug: string }[] {
  return getAllCollections().map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = getCollectionBySlug(slug);

  if (collection === undefined) {
    return {};
  }

  const cover = absoluteImageUrl(getCoverPhoto(collection));

  // Location goes in the title because collections are the site's main surface for
  // place-based search.
  const title =
    collection.location === null
      ? collection.title
      : `${collection.title} — ${collection.location}`;

  return {
    title,
    // The schema enforces a minimum length on this precisely so it works here.
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title,
      description: collection.description,
      type: "website",
      images: [cover],
    },
    twitter: { card: "summary_large_image", images: [cover] },
  };
}

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">,
) {
  const { slug } = await props.params;
  const collection = getCollectionBySlug(slug);

  if (collection === undefined) {
    notFound();
  }

  const photos = getPhotosInCollection(collection.slug);

  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      {/* The gallery node carries every frame in the collection, so one crawl of this
          page describes all of them rather than only the cover. */}
      <JsonLd
        data={graph([
          imageGalleryJsonLd(collection, photos),
          personJsonLd(),
          breadcrumbJsonLd([
            { name: "Collections", path: "/collections" },
            {
              name: collection.title,
              path: `/collections/${collection.slug}`,
            },
          ]),
        ])}
      />

      <header className="max-w-3xl">
        <h1 className="font-display text-paper text-4xl leading-tight font-light md:text-6xl">
          {collection.title}
        </h1>

        <div className="border-rule mt-5 flex flex-wrap items-baseline gap-x-4 border-t pt-3">
          {collection.location !== null && (
            <span className="rebate text-selenium">{collection.location}</span>
          )}
          <span className="rebate ml-auto">
            {photos.length === 1
              ? "1 frame"
              : `${String(photos.length)} frames`}
          </span>
        </div>

        <p className="text-paper/85 mt-6 text-lg leading-relaxed">
          {collection.description}
        </p>
      </header>

      <div className="mt-20">
        <PhotoGrid photos={photos} />
      </div>
    </div>
  );
}
