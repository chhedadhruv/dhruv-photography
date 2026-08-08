import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoGrid } from "@/components/PhotoGrid";
import {
  getAllCollections,
  getCollectionBySlug,
  getPhotosInCollection,
} from "@/lib/photos";

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

  return {
    title: collection.title,
    // The schema enforces a minimum length on this precisely so it works here.
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description: collection.description,
      type: "website",
    },
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
