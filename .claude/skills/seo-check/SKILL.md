---
name: seo-check
description: Audit the site against its four stated SEO goals — ranking for the owner's name, shoot locations, Google Images traffic, and journal topics. Checks metadata, structured data, alt text quality, sitemap coverage and Core Web Vitals. Use when asked to check, audit, or improve SEO, metadata, structured data, or search visibility.
---

# SEO check

The four goals this site is optimised for, in the owner's own priority order:

1. **His name** — "Dhruv Chheda photography"
2. **Locations he shoots** — city and trip names
3. **Google Images traffic** — discovery through image search
4. **Journal topics** — technique and gear queries

Audit against _these_, not a generic checklist. A finding that does not move one of them
is noise.

## Run the build first

```bash
yarn build
```

Every route must be marked **static** (`○`) in the output. A route that became dynamic is
a regression — it means something reached for request-time data, and it costs both speed
and crawlability.

## Metadata

For each route, check `generateMetadata` produces:

- A unique, specific `<title>`. Not "Photos" — "Street photography in Mumbai".
- A `description` that reads as a search snippet a human would click.
- A `canonical` on the real production origin. `NEXT_PUBLIC_SITE_URL` must be the live
  origin in production, or search engines index the wrong host.
- OpenGraph and Twitter tags with a real image.

Check for duplicate titles across routes — that is the most common silent failure.

## Structured data

Inspect the JSON-LD in the rendered HTML (`lib/jsonld.ts`):

| Page          | Type                                                                | Serves goal    |
| ------------- | ------------------------------------------------------------------- | -------------- |
| Home / About  | `Person` with `sameAs` to socials                                   | Name           |
| Photo pages   | `ImageObject` with `contentUrl`, `caption`, `creator`               | Google Images  |
| Collections   | `ImageGallery`, plus place data where the collection has a location | Locations      |
| Journal posts | `Article` with `datePublished`, `author`                            | Journal topics |
| All           | `BreadcrumbList`                                                    | Site structure |

Validate the emitted objects against schema.org requirements. Malformed JSON-LD is
ignored silently by Google, so an error here has no visible symptom.

## Images

This is goal 3 and the one most often neglected:

- **Alt text** must describe the image, not name it. `alt: "Sunset"` on a portfolio is a
  wasted signal. The schema enforces 10 characters minimum — that is a floor, not a
  target.
- **Captions** should be genuine prose. Duplicated or templated captions across photos
  look like thin content.
- **`srcset`** must list only widths the photo actually has (`derivativeWidths`).
- **Slugs and filenames** should be descriptive words, not `DSCF1234`.

## Sitemap and robots

```bash
yarn dev
curl -s localhost:3000/sitemap.xml
curl -s localhost:3000/robots.txt
```

- Every published photo, collection, and post appears exactly once.
- **Draft posts must not appear.**
- URLs use the production origin, not localhost.
- `robots.txt` does not block anything that should rank.

## Core Web Vitals

Photo sites fail on LCP and CLS specifically:

- **CLS** — every `<img>` needs intrinsic `width`/`height` from `photos.json`. This is
  what those fields exist for. Verify a rotated portrait photo reserves portrait space.
- **LCP** — the largest above-the-fold image should not be lazy-loaded. Everything below
  the fold should be.
- Confirm no unnecessary client components; the lightbox should be the only one.

## Report

Rank findings by which of the four goals they affect and how much. Prefer a handful of
findings that would actually change rankings over an exhaustive list of nitpicks. State
plainly when something is already correct.
