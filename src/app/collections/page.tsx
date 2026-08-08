import type { Metadata } from "next";
import Link from "next/link";

import { PhotoImage } from "@/components/PhotoImage";
import {
  getAllCollections,
  getCoverPhoto,
  getPhotosInCollection,
} from "@/lib/photos";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Bodies of work grouped by place and subject — travel, street, landscape and portrait photography by Dhruv Chheda.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  const collections = getAllCollections();

  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      <h1 className="font-display text-paper max-w-3xl text-4xl leading-tight font-light md:text-6xl">
        Collections
      </h1>

      {collections.length === 0 ? (
        <p className="rebate py-24 normal-case">No collections yet.</p>
      ) : (
        <ul className="mt-16 grid grid-cols-1 items-start gap-x-10 gap-y-16 md:grid-cols-2">
          {collections.map((collection) => {
            const cover = getCoverPhoto(collection);
            const count = getPhotosInCollection(collection.slug).length;

            return (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="overflow-hidden">
                    <PhotoImage
                      photo={cover}
                      sizes="(min-width: 768px) 46vw, 92vw"
                      className="transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  </div>

                  <h2 className="font-display text-paper group-hover:text-selenium mt-4 text-2xl leading-snug font-light transition-colors">
                    {collection.title}
                  </h2>

                  <div className="border-rule mt-2.5 flex flex-wrap items-baseline gap-x-4 border-t pt-2.5">
                    {collection.location !== null && (
                      <span className="rebate">{collection.location}</span>
                    )}
                    <span className="rebate ml-auto">
                      {count === 1 ? "1 frame" : `${String(count)} frames`}
                    </span>
                  </div>

                  <p className="text-dim mt-3 max-w-prose text-sm leading-relaxed">
                    {collection.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
