# dhruv-photography

Photography portfolio for [photography.dhruvchheda.com](https://photography.dhruvchheda.com).

Next.js (App Router) + TypeScript + Tailwind, statically generated, with a local ingest
pipeline that does the image work up front so the site itself stays simple and fast.

## Quick start

```bash
yarn install
cp .env.example .env.local
yarn dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `yarn dev` | Development server (Turbopack) |
| `yarn build` | Production build |
| `yarn lint` | ESLint, **zero warnings tolerated** |
| `yarn typecheck` | Generates route types, then `tsc --noEmit` |
| `yarn test` | Vitest, single run |
| `yarn test:watch` | Vitest in watch mode |
| `yarn verify` | lint + typecheck + test — the same gates CI runs |
| `yarn ingest` | Process new photos (see below) |

## How images work, and why

The site never reads image files at build time. Instead:

1. You drop originals into `originals/` (gitignored — raw files never enter git history).
2. `yarn ingest` reads EXIF, generates responsive AVIF/WebP derivatives plus a tiny inline
   blur placeholder, uploads the derivatives to Cloudflare R2, and writes
   `content/photos.json`.
3. The site builds purely from that committed JSON.

**Why this shape.** Two requirements pull against each other: EXIF has to be extracted
automatically from the file, but the files themselves need to live on a CDN rather than in
the repo. Doing the extraction once, locally, and committing only the *result* satisfies
both — the repo stays small, the build is hermetic and fast, and photo metadata is
version-controlled and reviewable in diffs.

**No `next/image`.** The pipeline already produced optimized derivatives at fixed widths,
so pages use plain `<img>` with a hand-built `srcset`. Running those through `next/image`
would re-optimize already-optimized files, require `remotePatterns` config, and bill for
the privilege. Intrinsic `width`/`height` come from `photos.json`, which is what actually
prevents layout shift.

Before R2 exists, `yarn ingest --local` writes derivatives to `public/images/` instead, so
the whole site runs end-to-end with no credentials.

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

## Setup still required

| Item | Where |
| --- | --- |
| Cloudflare R2 bucket + API token | Cloudflare dashboard → R2 |
| R2 custom domain for images | Avoids the rate-limited `r2.dev` URL |
| `.env.local` | Copy from `.env.example` |
| Vercel project + env vars | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_IMAGE_BASE_URL` |
| DNS `CNAME` for `photography` | Points the subdomain at Vercel |
| Google Search Console | Submit the sitemap |
| Real bio, gear, socials | `src/site.config.ts` (marked `TODO`) |

## Notes

`AGENTS.md` is generated and re-added by `next dev`; it points AI agents at the
version-matched Next.js docs bundled in `node_modules/next/dist/docs/`.

Node 22.20.0 is below the engine floor of the newest `jsdom` and `lint-staged`, so both are
pinned a major behind. Bumping to Node ≥ 22.22 lets those pins be dropped.
