import type { JournalPostMeta } from "./journal";
import type { Collection, Photo } from "./schema";
import { absoluteImageUrl, absoluteUrl } from "./seo";

import { siteConfig } from "@/site.config";

/**
 * schema.org structured data.
 *
 * Search engines cannot see a photograph. Everything they know about these pages comes
 * from the markup, and structured data is the most explicit form of it: it says outright
 * that this is a photograph, that Dhruv made it, where it was taken, and what it shows.
 *
 * Each builder maps to one of the site's stated search goals -- `Person` and `sameAs` to
 * ranking on his name, `ImageObject` to Google Images, `contentLocation` to shoot
 * locations, `Article` to journal topics.
 *
 * Malformed JSON-LD is discarded silently by Google, so mistakes here have no visible
 * symptom. That is why the shapes are typed and tested rather than written by hand per page.
 */

/** A JSON-LD node. Values are `unknown` because schema.org allows nested nodes and arrays. */
export type JsonLd = Record<string, unknown>;

const PERSON_ID = absoluteUrl("/#person");
const WEBSITE_ID = absoluteUrl("/#website");

/**
 * The author, given a stable `@id` so every other node can reference the same entity
 * rather than describing a new person each time.
 *
 * `sameAs` is the important field: it is how a search engine connects this site to the
 * Instagram account and the main site, and it is the main lever for owning the branded
 * query.
 */
export function personJsonLd(): JsonLd {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: siteConfig.author.name,
    description: siteConfig.author.bio,
    url: absoluteUrl("/about"),
    sameAs: siteConfig.socials.map((social) => social.href),
    jobTitle: "Photographer",
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: "en",
    creator: { "@id": PERSON_ID },
  };
}

/**
 * A single photograph.
 *
 * `contentLocation` is what makes a frame discoverable by place, and `dateCreated` uses
 * the date-only form because the stored timestamp is a wall-clock reading with no
 * timezone -- publishing it as a precise instant would assert a precision that does not
 * exist.
 */
export function imageObjectJsonLd(photo: Photo): JsonLd {
  const node: JsonLd = {
    "@type": "ImageObject",
    "@id": absoluteUrl(`/photos/${photo.slug}#image`),
    contentUrl: absoluteImageUrl(photo),
    url: absoluteUrl(`/photos/${photo.slug}`),
    name: photo.title,
    // Both fields exist and mean different things: the caption is the prose shown
    // alongside, the description is what the image depicts.
    caption: photo.caption,
    description: photo.alt,
    width: photo.width,
    height: photo.height,
    creator: { "@id": PERSON_ID },
    copyrightHolder: { "@id": PERSON_ID },
    creditText: siteConfig.author.name,
    copyrightNotice: siteConfig.copyright,
    representativeOfPage: true,
  };

  if (photo.location !== null) {
    node["contentLocation"] = { "@type": "Place", name: photo.location };
  }

  if (photo.capturedAt !== null) {
    node["dateCreated"] = photo.capturedAt.slice(0, 10);
  }

  const keywords = [photo.exif.camera, photo.exif.lens, photo.location].filter(
    (value): value is string => value !== null,
  );

  if (keywords.length > 0) {
    node["keywords"] = keywords;
  }

  return node;
}

/** A collection page, with its frames attached so the gallery is machine-readable. */
export function imageGalleryJsonLd(
  collection: Collection,
  photos: readonly Photo[],
): JsonLd {
  const node: JsonLd = {
    "@type": "ImageGallery",
    "@id": absoluteUrl(`/collections/${collection.slug}#gallery`),
    url: absoluteUrl(`/collections/${collection.slug}`),
    name: collection.title,
    description: collection.description,
    author: { "@id": PERSON_ID },
    numberOfItems: photos.length,
    associatedMedia: photos.map((photo) => imageObjectJsonLd(photo)),
  };

  if (collection.location !== null) {
    node["contentLocation"] = { "@type": "Place", name: collection.location };
  }

  return node;
}

export function articleJsonLd(
  post: JournalPostMeta,
  coverPhoto: Photo | undefined,
): JsonLd {
  const node: JsonLd = {
    "@type": "Article",
    "@id": absoluteUrl(`/journal/${post.slug}#article`),
    url: absoluteUrl(`/journal/${post.slug}`),
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
  };

  if (post.tags.length > 0) {
    node["keywords"] = [...post.tags];
  }

  if (coverPhoto !== undefined) {
    node["image"] = absoluteImageUrl(coverPhoto);
  }

  return node;
}

/**
 * Breadcrumbs, which is how a search result shows a path instead of a bare URL.
 *
 * Positions are 1-based per the spec; getting that wrong is one of the mistakes that
 * causes the whole node to be dropped without comment.
 */
export function breadcrumbJsonLd(
  trail: readonly { name: string; path: string }[],
): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Wraps nodes into one graph, so a page emits a single connected document. */
export function graph(nodes: readonly JsonLd[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
