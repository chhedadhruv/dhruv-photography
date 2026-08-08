# dhruv-photography

Photography portfolio for [photography.dhruvchheda.com](https://photography.dhruvchheda.com).

Next.js (App Router) + TypeScript + Tailwind, statically generated, with a local ingest
pipeline that does the image work up front so the site itself stays simple and fast.

## Quick start

```bash
yarn install
cp .env.example .env.local
yarn seed:samples      # generate the placeholder originals the sample content refers to
yarn ingest --local    # process them into public/images/
yarn dev
```

The repo ships with three synthetic sample photographs, two collections and one journal
post, so the site runs end to end with no Cloudflare account and no photographs of your
own. `originals/` and `public/images/` are gitignored — binaries do not belong in git — so
`yarn seed:samples` regenerates the inputs, and ingest produces the derivatives from them.

When you add your own work, delete `originals/*.jpg` and the sample entries in
`content/photos.json`.

## Scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `yarn dev`          | Development server (Turbopack)                            |
| `yarn build`        | Production build                                          |
| `yarn lint`         | ESLint, **zero warnings tolerated**                       |
| `yarn format`       | Prettier, write mode                                      |
| `yarn format:check` | Prettier, check only                                      |
| `yarn typecheck`    | Generates route types, then `tsc --noEmit`                |
| `yarn test`         | Vitest, single run                                        |
| `yarn test:watch`   | Vitest in watch mode                                      |
| `yarn verify`       | format + lint + typecheck + test — the same gates CI runs |
| `yarn ingest`       | Process new photos (see below)                            |
| `yarn seed:samples` | Regenerate the placeholder sample originals               |
| `yarn icons`        | Regenerate the favicon, touch icon and social card        |

## How images work, and why

The site never reads image files at build time. Instead:

1. You drop originals into `originals/` (gitignored — raw files never enter git history).
2. `yarn ingest` reads EXIF, generates responsive AVIF/WebP derivatives plus a tiny inline
   blur placeholder, uploads the derivatives to Cloudflare R2, and writes
   `content/photos.json`.
3. The site builds purely from that committed JSON.

**Why this shape.** Two requirements pull against each other: EXIF has to be extracted
automatically from the file, but the files themselves need to live on a CDN rather than in
the repo. Doing the extraction once, locally, and committing only the _result_ satisfies
both — the repo stays small, the build is hermetic and fast, and photo metadata is
version-controlled and reviewable in diffs.

**No `next/image`.** The pipeline already produced optimized derivatives at fixed widths,
so pages use plain `<img>` with a hand-built `srcset`. Running those through `next/image`
would re-optimize already-optimized files, require `remotePatterns` config, and bill for
the privilege. Intrinsic `width`/`height` come from `photos.json`, which is what actually
prevents layout shift.

Before R2 exists, `yarn ingest --local` writes derivatives to `public/images/` instead, so
the whole site runs end-to-end with no credentials.

### Adding photos

```bash
cp ~/exports/*.jpg originals/
yarn ingest              # or: yarn ingest --local
```

Then open `content/photos.json` and fill in `alt`, `caption`, `location`, and
`collections` for each new photo. Ingest tells you exactly which ones are waiting.

| Flag      | Effect                                                           |
| --------- | ---------------------------------------------------------------- |
| `--local` | Write derivatives to `public/images/` instead of uploading to R2 |
| `--force` | Re-encode photos that were already ingested                      |

**Re-running is safe.** Already-ingested files are skipped, and `--force` re-derives
everything technical while leaving your `title`, `alt`, `caption`, `location`,
`collections` and `featured` untouched. Losing a caption you spent ten minutes on because
you re-ran a command would be unforgivable, so the pipeline treats your writing as
authoritative and its own output as disposable.

Two details worth knowing, both discovered by testing rather than assumption:

- **EXIF timestamps have no timezone.** exifr's default is to read them in the _ingesting
  machine's_ timezone and convert to UTC, which turns a 06:12 dawn frame into 00:42Z. The
  pipeline reads the raw string and preserves the camera's wall-clock time instead.
- **`sharp.metadata()` reports stored dimensions, not displayed ones.** A portrait frame
  shot on a rotated body reports landscape dimensions plus an orientation tag, even on a
  pipeline with `.rotate()` applied. The pipeline swaps them explicitly, otherwise every
  rotated photo would reserve the wrong space and shift the page on load.

## Content model

Content lives in `content/`, outside `src/`, because it is data rather than code:

| File                       | Written by    | Holds                                                                                                           |
| -------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `content/photos.json`      | `yarn ingest` | One entry per photo: slug, title, alt, caption, location, EXIF, dimensions, derivative widths, blur placeholder |
| `content/collections.json` | You, by hand  | Collection slug, title, description, location, cover photo, sort order                                          |
| `content/journal/*.md`     | You, by hand  | Frontmatter + markdown body                                                                                     |

Everything is validated by Zod at module load (`src/lib/schema.ts`), so **invalid content
fails `yarn build`** instead of shipping a broken page. Three rules are deliberately strict:

- **`alt` is required**, and must be long enough to actually describe the image. It's both
  the accessibility contract and the strongest Google Images signal.
- **`caption` is required.** A per-photo page with no prose is thin content; if a photo
  isn't worth a sentence, it doesn't need its own URL.
- **Collection descriptions have a minimum length**, because they double as the page's meta
  description.

On top of the per-file schemas, `src/lib/photos.ts` checks things a schema structurally
can't: slug uniqueness, that every photo's collection references resolve, that every cover
photo exists, and that no collection is empty. Without this, a typo'd collection slug
wouldn't error — the photo would just silently vanish from the page it belonged on.

## SEO

The site targets four things, and each has a specific mechanism behind it rather than a
generic "we added meta tags":

| Goal                                  | Mechanism                                                                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ranking on "Dhruv Chheda photography" | `Person` structured data with a stable `@id` referenced from every page, and `sameAs` linking Instagram, GitHub and the main site. The About page title leads with the name. |
| Shoot locations                       | `contentLocation` on every photo, location in photo and collection page titles, and location text in the rebate strip and shooting notes.                                    |
| Google Images                         | A per-photo URL, `ImageObject` structured data, required descriptive `alt`, and an **image sitemap** — `sitemap.xml` lists each photograph under its page.                   |
| Journal topics                        | `Article` structured data, and markdown rendered to HTML at build time so the prose is in the response body.                                                                 |

Everything prerenders. `yarn build` should show every route as `○` or `●`; a `ƒ` means
something reached for request-time data and both speed and crawlability suffered.

Two failure modes worth knowing, because neither has a visible symptom:

- **Malformed JSON-LD is discarded silently** by Google — no error, no warning, no rich
  result. That is why `src/lib/jsonld.ts` is typed and covered by tests rather than
  hand-written per page.
- **Relative URLs in structured data are ignored**, not rejected. `src/lib/seo.ts` makes
  every URL absolute, and the tests assert it.

`NEXT_PUBLIC_SITE_URL` must be the real production origin on Vercel. If it is left as
localhost, every canonical, sitemap entry and structured-data URL points at your laptop.

## Quality gates

Strict TypeScript (`strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
and friends), type-aware ESLint, and Vitest. Two rules are enforced mechanically rather
than by convention:

- **`--max-warnings 0`** — a warning is an unfixed problem, so it fails the build.
- **`noInlineConfig: true`** — `eslint-disable` comments are ignored by ESLint entirely, so
  adding one silences nothing. `@ts-ignore` is separately banned. When a library hands back
  loosely-typed data, the fix is to parse it into a real type (Zod), not to suppress.

Enforced locally by husky: `pre-commit` runs lint-staged + typecheck + tests, `pre-push`
runs the full `yarn verify` and a build. CI re-runs all of it on every PR.

### Tests

144 tests across two Vitest projects — `node` for content and pipeline logic, `jsdom` for
components. They target the places where a mistake would otherwise be invisible:

- **Content rules** — that missing alt text, thin captions and broken collection
  references actually fail the build.
- **Ordering determinism** — same-second photos and same-day posts must not swap places
  between builds.
- **The two library traps** — EXIF timestamps keeping their wall-clock time, and
  `sharp.metadata()` reporting pre-rotation dimensions. A test decodes a real derivative
  to check the recorded numbers describe the bytes actually served.
- **Structured data** — required fields, 1-based breadcrumb positions, absolute URLs, and
  omitted-rather-than-empty values. Google discards malformed JSON-LD silently.
- **Layout shift and loading** — intrinsic dimensions present, exactly one eager image.
- **XSS in JSON-LD** — a caption containing `</script>` must not close the tag.

The suite was checked by breaking things on purpose: removing the Escape handler and the
angle-bracket escaping each produced failures. A green test that cannot go red is
decoration.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full first-time setup: Cloudflare R2, the
image domain, Vercel, DNS, and Search Console.

## Setup still required

| Item                             | Where                                                |
| -------------------------------- | ---------------------------------------------------- |
| Cloudflare R2 bucket + API token | Cloudflare dashboard → R2                            |
| R2 custom domain for images      | Avoids the rate-limited `r2.dev` URL                 |
| `.env.local`                     | Copy from `.env.example`                             |
| Vercel project + env vars        | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_IMAGE_BASE_URL` |
| DNS `CNAME` for `photography`    | Points the subdomain at Vercel                       |
| Google Search Console            | Submit the sitemap                                   |
| Real bio, gear, socials          | `src/site.config.ts` (marked `TODO`)                 |

## Notes

`AGENTS.md` is generated and re-added by `next dev`; it points AI agents at the
version-matched Next.js docs bundled in `node_modules/next/dist/docs/`.

Node 22.20.0 is below the engine floor of the newest `jsdom` and `lint-staged`, so both are
pinned a major behind. Bumping to Node ≥ 22.22 lets those pins be dropped.
