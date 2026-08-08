import { describe, expect, it } from "vitest";

import {
  articleJsonLd,
  breadcrumbJsonLd,
  graph,
  imageGalleryJsonLd,
  imageObjectJsonLd,
  personJsonLd,
  webSiteJsonLd,
} from "./jsonld";
import { makeCollection, makePhoto } from "./test-fixtures";

/**
 * Google discards malformed JSON-LD silently -- a broken node produces no error, no
 * warning and no rich result, just nothing. There is no way to notice the failure by
 * looking at the site, so the required fields are asserted here instead.
 */

/** Every absolute URL must be absolute; a relative one is ignored rather than rejected. */
function expectAbsolute(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(String(value)).toMatch(/^https?:\/\//);
}

describe("personJsonLd", () => {
  it("carries the fields that identify a person", () => {
    const person = personJsonLd();

    expect(person["@type"]).toBe("Person");
    expect(person["name"]).toBe("Dhruv Chheda");
    expectAbsolute(person["@id"]);
    expectAbsolute(person["url"]);
  });

  // This is the field that connects the site to the Instagram account and the main site,
  // which is the whole mechanism behind ranking on a personal name.
  it("lists every social profile as sameAs, absolutely", () => {
    const sameAs = personJsonLd()["sameAs"];

    expect(Array.isArray(sameAs)).toBe(true);
    const urls = sameAs as unknown[];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expectAbsolute(url);
    }
    expect(urls).toContain("https://www.instagram.com/pixel.bydhruv/");
  });
});

describe("webSiteJsonLd", () => {
  it("references the person by id rather than redescribing them", () => {
    expect(webSiteJsonLd()["creator"]).toEqual({
      "@id": personJsonLd()["@id"],
    });
  });
});

describe("imageObjectJsonLd", () => {
  it("carries the fields Google Images needs", () => {
    const node = imageObjectJsonLd(makePhoto());

    expect(node["@type"]).toBe("ImageObject");
    expectAbsolute(node["contentUrl"]);
    expectAbsolute(node["url"]);
    expect(node["name"]).toBe("Harbour at dawn");
    expect(node["width"]).toBe(4000);
    expect(node["height"]).toBe(2667);
  });

  // Caption and description are different claims: one is the prose shown beside the
  // photo, the other is what the photo depicts. Collapsing them wastes a field.
  it("distinguishes the caption from the description", () => {
    const photo = makePhoto();
    const node = imageObjectJsonLd(photo);

    expect(node["caption"]).toBe(photo.caption);
    expect(node["description"]).toBe(photo.alt);
    expect(node["caption"]).not.toBe(node["description"]);
  });

  it("publishes the shoot location as a Place", () => {
    const node = imageObjectJsonLd(makePhoto({ location: "Bandra, Mumbai" }));

    expect(node["contentLocation"]).toEqual({
      "@type": "Place",
      name: "Bandra, Mumbai",
    });
  });

  // Absent is better than wrong: an empty Place would claim the photo has a location.
  it("omits the location entirely when there is none", () => {
    const node = imageObjectJsonLd(makePhoto({ location: null }));
    expect(node["contentLocation"]).toBeUndefined();
  });

  // The stored timestamp is a wall-clock reading with no timezone, so publishing a
  // precise instant would assert accuracy that does not exist.
  it("publishes the capture date as a date, not an instant", () => {
    const node = imageObjectJsonLd(
      makePhoto({ capturedAt: "2025-01-15T06:12:00.000Z" }),
    );
    expect(node["dateCreated"]).toBe("2025-01-15");
  });

  it("omits the date when the file carried none", () => {
    expect(
      imageObjectJsonLd(makePhoto({ capturedAt: null }))["dateCreated"],
    ).toBeUndefined();
  });

  it("attributes the photograph to the same person entity", () => {
    const node = imageObjectJsonLd(makePhoto());
    expect(node["creator"]).toEqual({ "@id": personJsonLd()["@id"] });
  });
});

describe("imageGalleryJsonLd", () => {
  it("attaches every frame so one crawl describes the whole collection", () => {
    const photos = [
      makePhoto({ slug: "one" }),
      makePhoto({ slug: "two" }),
      makePhoto({ slug: "three" }),
    ];
    const node = imageGalleryJsonLd(makeCollection(), photos);

    expect(node["@type"]).toBe("ImageGallery");
    expect(node["numberOfItems"]).toBe(3);
    expect((node["associatedMedia"] as unknown[]).length).toBe(3);
  });
});

describe("articleJsonLd", () => {
  const post = {
    slug: "waiting-for-the-light",
    title: "Waiting for the light",
    description:
      "On the unglamorous part of landscape photography and the waiting it involves.",
    publishedAt: "2025-02-10",
    tags: ["landscape", "technique"],
    draft: false,
  };

  it("carries the fields an Article requires", () => {
    const node = articleJsonLd(post, undefined);

    expect(node["@type"]).toBe("Article");
    expect(node["headline"]).toBe(post.title);
    expect(node["datePublished"]).toBe("2025-02-10");
    expect(node["author"]).toEqual({ "@id": personJsonLd()["@id"] });
    expectAbsolute(node["url"]);
  });

  it("includes an absolute cover image when the post has one", () => {
    const node = articleJsonLd(post, makePhoto());
    expectAbsolute(node["image"]);
  });

  it("omits the image rather than emitting an empty one", () => {
    expect(articleJsonLd(post, undefined)["image"]).toBeUndefined();
  });
});

describe("breadcrumbJsonLd", () => {
  // Positions are 1-based in the spec. Starting at 0 is a common mistake and drops the
  // whole node without comment.
  it("numbers positions from one", () => {
    const node = breadcrumbJsonLd([
      { name: "Frames", path: "/" },
      { name: "Harbour at dawn", path: "/photos/harbour-at-dawn" },
    ]);

    const items = node["itemListElement"] as { position: number }[];
    expect(items.map((item) => item.position)).toEqual([1, 2]);
  });

  it("makes every crumb target absolute", () => {
    const node = breadcrumbJsonLd([{ name: "Frames", path: "/" }]);
    const items = node["itemListElement"] as { item: unknown }[];
    expectAbsolute(items[0]?.item);
  });
});

describe("graph", () => {
  it("emits one document with the schema.org context", () => {
    const document = graph([personJsonLd(), webSiteJsonLd()]);

    expect(document["@context"]).toBe("https://schema.org");
    expect((document["@graph"] as unknown[]).length).toBe(2);
  });

  // The escaping in the JsonLd component depends on this being serialisable at all.
  it("survives JSON serialisation", () => {
    expect(() =>
      JSON.stringify(graph([imageObjectJsonLd(makePhoto())])),
    ).not.toThrow();
  });
});
