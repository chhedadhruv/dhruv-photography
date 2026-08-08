import type { MetadataRoute } from "next";

import { absoluteImageUrl, absoluteUrl, ROUTES } from "@/lib/seo";
import { getAllPosts } from "@/lib/journal";
import {
  getAllCollections,
  getAllPhotos,
  getCoverPhoto,
  getPhotoBySlug,
  getPhotosInCollection,
} from "@/lib/photos";

/**
 * Every indexable URL, with its images attached.
 *
 * The `images` field emits Google's image-sitemap extension, which is the most direct
 * lever available for the site's image-search goal: it tells Google a photograph exists at
 * a URL without waiting for a crawl to discover it.
 *
 * `lastModified` is only set where a real date exists. Stamping `new Date()` on everything
 * would claim the whole site changed on every deploy, and a lastmod that is always "now"
 * is one a crawler learns to ignore.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const photos = getAllPhotos();
  const collections = getAllCollections();
  // Drafts are excluded from production builds by `getAllPosts`, so they never reach here.
  const posts = getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl(ROUTES.home), changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl(ROUTES.collections),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl(ROUTES.journal),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // The About page is where the branded query lands, so it is not a low-priority
    // afterthought here.
    {
      url: absoluteUrl(ROUTES.about),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    { url: absoluteUrl(ROUTES.gear), changeFrequency: "yearly", priority: 0.5 },
  ];

  const photoPages: MetadataRoute.Sitemap = photos.map((photo) => ({
    url: absoluteUrl(`/photos/${photo.slug}`),
    images: [absoluteImageUrl(photo)],
    changeFrequency: "yearly",
    priority: 0.8,
    ...(photo.capturedAt === null
      ? {}
      : { lastModified: photo.capturedAt.slice(0, 10) }),
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map(
    (collection) => ({
      url: absoluteUrl(`/collections/${collection.slug}`),
      // Every frame in the collection, so one crawl of this page surfaces all of them.
      images: getPhotosInCollection(collection.slug).map((photo) =>
        absoluteImageUrl(photo),
      ),
      changeFrequency: "monthly",
      priority: 0.9,
    }),
  );

  const postPages: MetadataRoute.Sitemap = posts.map((post) => {
    const cover =
      post.coverPhotoSlug === undefined
        ? undefined
        : getPhotoBySlug(post.coverPhotoSlug);

    return {
      url: absoluteUrl(`/journal/${post.slug}`),
      lastModified: post.publishedAt,
      changeFrequency: "yearly",
      priority: 0.7,
      ...(cover === undefined ? {} : { images: [absoluteImageUrl(cover)] }),
    };
  });

  // Home carries the lead frame, so the most important photograph is announced on the
  // most important URL.
  const lead = photos.find((photo) => photo.featured) ?? photos[0];
  const home = staticPages[0];
  if (lead !== undefined && home !== undefined) {
    home.images = [absoluteImageUrl(lead)];
  }

  const collectionCovers = collections.map((collection) =>
    absoluteImageUrl(getCoverPhoto(collection)),
  );
  const collectionsIndex = staticPages[1];
  if (collectionsIndex !== undefined && collectionCovers.length > 0) {
    collectionsIndex.images = collectionCovers;
  }

  return [...staticPages, ...collectionPages, ...photoPages, ...postPages];
}
