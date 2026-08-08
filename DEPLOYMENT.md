# Deploying to photography.dhruvchheda.com

Everything here needs accounts, credentials or DNS, so it is all done by hand once. After
that, publishing is `git push`.

## What is actually being deployed

Worth holding in your head, because it explains why the order below matters:

- **Vercel serves HTML only.** Every route is prerendered at build time from
  `content/*.json` and `content/journal/*.md`, which are committed to the repo.
- **R2 serves the photographs.** The build never contacts R2, and Vercel never processes
  an image. `yarn ingest` uploads derivatives from your machine.
- **The build has no secrets.** R2 credentials live only in your local `.env.local`. Vercel
  never needs them, and you should not add them there.

So the deploy is: images go up once from your laptop, and the site is a static export that
points at them.

---

## Order of operations

R2 comes first because `NEXT_PUBLIC_IMAGE_BASE_URL` has to be known at build time. Deploy
Vercel first and the first build will point at `/images`, which does not exist in
production.

| #   | Step                                   | Where              |
| --- | -------------------------------------- | ------------------ |
| 1   | Create the R2 bucket                   | Cloudflare         |
| 2   | Create an API token, fill `.env.local` | Cloudflare → local |
| 3   | Give the bucket a public custom domain | Cloudflare         |
| 4   | Upload your photographs                | Local              |
| 5   | Replace the sample content             | Local              |
| 6   | Create the Vercel project + env vars   | Vercel             |
| 7   | Point the subdomain at Vercel          | Cloudflare DNS     |
| 8   | Verify                                 | Browser            |
| 9   | Submit the sitemap                     | Search Console     |

---

## 1. Create the R2 bucket

Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.

- **Name:** `dhruv-photography`
- **Location:** Automatic
- Leave public access **off** for now — step 3 handles it properly.

You will be asked for a payment method even on the free tier. R2's free allowance is 10 GB
of storage and, importantly, **zero egress charges** — the reason it was chosen over S3
for an image-heavy site. Your whole library at ~50 photos will sit in the low hundreds of
megabytes.

## 2. Create an API token

R2 → **API** → **Manage API tokens** → **Create Account API token**.

- **Permission:** Object Read & Write
- **Scope:** the `dhruv-photography` bucket only, not all buckets
- **TTL:** forever, unless you want to rotate it

You get an **Access Key ID** and a **Secret Access Key**. The secret is shown once.

Your **Account ID** is on the R2 overview page (also in the dashboard URL).

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://photography.dhruvchheda.com
NEXT_PUBLIC_IMAGE_BASE_URL=https://images.dhruvchheda.com

R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET=dhruv-photography
```

`.env.local` is gitignored and Claude Code is configured not to read it. Nothing in it
should ever reach the repo.

> While you are still working locally, keep `NEXT_PUBLIC_IMAGE_BASE_URL=/images` and use
> `yarn ingest --local`. Switch to the R2 values when you are ready to publish for real.

## 3. Give the bucket a public domain

R2 bucket → **Settings** → **Public access** → **Custom Domains** → **Connect Domain**.

Enter `images.dhruvchheda.com`. Cloudflare creates the DNS record and issues the
certificate itself, because your DNS is already on Cloudflare (`vita.ns.cloudflare.com`,
`duke.ns.cloudflare.com`) — this is the one place where being on Cloudflare pays off
directly.

**Use a custom domain, not the `r2.dev` URL.** The `r2.dev` endpoint is rate-limited and
explicitly not for production, and it would appear in every `srcset` on the site.

**CORS is not needed.** The site loads images with plain `<img>` tags, which are not
subject to CORS. Only `fetch` or `<canvas>` would need it.

## 4. Upload your photographs

```bash
cp ~/wherever/your-exports/*.jpg originals/
yarn ingest
```

Without `--local`, this uploads to R2. It prints which photos still need alt text and
captions — the site will not build until you write them.

Then edit `content/photos.json` for each new photo, and add collections in
`content/collections.json`. The `add-photos` skill covers the standards.

## 5. Replace the sample content

**Do this before going live.** The repo ships three synthetic gradient images so the site
runs out of the box. They should not be on your portfolio.

```bash
rm originals/harbour-at-dawn.jpg originals/night-crossing.jpg originals/ridge-line.jpg
```

Then remove their entries from `content/photos.json`, remove the `coastline` and
`after-dark` entries from `content/collections.json` (or repurpose them), and either
rewrite or delete `content/journal/waiting-for-the-light.md`.

You can also delete `pipeline/seed-samples.ts` and its `seed:samples` script once you have
your own photographs in.

Also finish the `TODO`s in `src/site.config.ts` — the bio especially. It is the text most
likely to rank for your name and the only place a stranger learns who took the pictures.

Then:

```bash
yarn verify
yarn build
```

## 6. Create the Vercel project

Vercel → **Add New** → **Project** → import `chhedadhruv/dhruv-photography`.

- **Framework preset:** Next.js (detected)
- **Build command / install command:** leave as detected — the `yarn.lock` is picked up
  automatically
- **Node version:** 22.x

Add **environment variables** for Production, Preview and Development:

| Name                         | Value                                 |
| ---------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`       | `https://photography.dhruvchheda.com` |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | `https://images.dhruvchheda.com`      |

**Do not add the `R2_*` variables.** The build does not use them, and putting a secret
where it is not needed is how secrets leak.

> `NEXT_PUBLIC_SITE_URL` is the one that matters most. Every canonical URL, sitemap entry,
> OpenGraph tag and structured-data `@id` is built from it. Left at localhost, you would be
> telling Google your site lives on your laptop.

Deploy. The first build will fail if any content is invalid — that is the schema doing its
job, and the error names the file and field.

## 7. Point the subdomain at Vercel

In Vercel: **Project → Settings → Domains → Add** `photography.dhruvchheda.com`. Vercel
shows you the exact record to create.

In Cloudflare DNS, add what it asks for — for a subdomain this is normally:

| Type  | Name          | Target                 | Proxy                     |
| ----- | ------------- | ---------------------- | ------------------------- |
| CNAME | `photography` | `cname.vercel-dns.com` | **DNS only (grey cloud)** |

**The grey cloud is not optional.** Proxying a Vercel-hosted domain through Cloudflare
puts two CDNs in series and commonly produces certificate errors or redirect loops,
because Vercel wants to terminate TLS itself. Your existing `www.dhruvchheda.com` is
already set up DNS-only, so this matches what is working today.

Note the asymmetry, since it is confusing: **`images.` is proxied by Cloudflare** (R2
requires it, and R2 sets it up for you), while **`photography.` is not**. Different
providers, opposite settings.

Certificate issuance takes a few minutes.

## 8. Verify

```bash
curl -sI https://photography.dhruvchheda.com | head -1
curl -s https://photography.dhruvchheda.com/robots.txt
curl -s https://photography.dhruvchheda.com/sitemap.xml | head -20
```

Check, in order:

- [ ] The home page loads and **photographs actually appear** — if the layout is right but
      frames are missing, `NEXT_PUBLIC_IMAGE_BASE_URL` is wrong or the R2 domain is not live
- [ ] `robots.txt` names `https://photography.dhruvchheda.com/sitemap.xml` — not localhost
- [ ] `sitemap.xml` URLs are all on the real origin
- [ ] A photo page shows its EXIF panel
- [ ] View source on a photo page: the `application/ld+json` block is present
- [ ] Paste a photo page URL into Google's [Rich Results Test](https://search.google.com/test/rich-results) — it should detect `ImageObject` and `BreadcrumbList`
- [ ] Run Lighthouse on a collection page; watch **LCP** and **CLS** specifically

## 9. Submit to Google

[Search Console](https://search.google.com/search-console) → **Add property** → URL prefix
→ `https://photography.dhruvchheda.com`.

Verification is easiest via the DNS TXT record, since you control Cloudflare DNS.

Then **Sitemaps** → submit `sitemap.xml`.

This step is not optional for the image-search goal. Google will find the site eventually,
but the image sitemap is what tells it a photograph exists at a URL rather than waiting for
a crawl to notice.

Expect nothing for a few weeks. Indexing a new domain is slow, and image search is slower.

---

## Publishing after the first deploy

```bash
git checkout -b content/add-some-photos
cp ~/exports/*.jpg originals/
yarn ingest                       # uploads to R2
# write alt text and captions in content/photos.json
yarn verify
git add -A && git commit          # hooks run lint, types and tests
git push
```

Open a PR, let CI pass, merge. Vercel deploys `main` automatically.

The photographs are already on R2 by the time you push — the deploy only ships HTML.

---

## Troubleshooting

| Symptom                                        | Cause                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Layout renders, images are broken              | `NEXT_PUBLIC_IMAGE_BASE_URL` wrong, or the R2 custom domain has not finished provisioning                 |
| Sitemap and canonicals say `localhost`         | `NEXT_PUBLIC_SITE_URL` not set on Vercel                                                                  |
| Certificate error on the subdomain             | The Cloudflare record is proxied — set it to DNS only                                                     |
| Build fails with `ContentValidationError`      | Content is invalid; the message names the file and field. Fix the content, not the schema                 |
| `yarn ingest` says `Missing R2_ACCOUNT_ID`     | `.env.local` missing or incomplete — or you meant `--local`                                               |
| Ingest skips everything but images are missing | Only happens if derivatives were deleted; `yarn ingest --force` re-uploads                                |
| Photos missing from a collection page          | The collection slug on the photo does not match — the build should have caught this, so check you rebuilt |

## Running costs

| Service       | Expected                                             |
| ------------- | ---------------------------------------------------- |
| Cloudflare R2 | £0 — 10 GB free, and no egress charges at any volume |
| Vercel        | £0 — Hobby covers a static site comfortably          |
| Domain        | Already owned                                        |

The zero-egress point is the one that matters long term: on S3 or Vercel Blob, a
photography site that suddenly gets traffic gets a bill to match. On R2 it does not.
