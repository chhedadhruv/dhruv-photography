---
name: add-photos
description: Publish new photographs to the site — run the ingest pipeline, write alt text and captions to the standard the schema enforces, assign collections, and verify. Use whenever the user wants to add, publish, or ingest photos, or mentions dropping files into originals/.
---

# Adding photos

The pipeline handles everything technical. Your job is the words — which is the part
that decides whether the photo's page is worth having.

## 1. Check what is waiting

```bash
ls originals/
```

If it is empty, ask the user to drop files in. Do not invent placeholder photos.

## 2. Ingest

```bash
yarn ingest --local     # before R2 credentials exist
yarn ingest             # once R2 is configured
```

Already-ingested files are skipped. Add `--force` only when a photo has been re-edited
and needs re-encoding. Ingest prints exactly which photos still need copy.

**Never hand-edit the technical fields** — `width`, `height`, `derivativeWidths`,
`blurDataUrl`, `exif`, `capturedAt`, `sourceFile`. They are derived, and `--force`
overwrites them.

## 3. Write the copy

Edit `content/photos.json`. For each new photo fill in:

| Field         | Standard                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------ |
| `title`       | Short, specific. Ingest guesses it from the filename — that guess is almost always wrong.  |
| `alt`         | **Required, min 10 chars.** Describe what is _in_ the frame for someone who cannot see it. |
| `caption`     | **Required.** A sentence or two of actual observation.                                     |
| `location`    | Human-readable, e.g. `"Bandra, Mumbai"`. `null` only if genuinely placeless.               |
| `collections` | Array of existing collection slugs.                                                        |
| `featured`    | `true` only for genuinely strongest work.                                                  |

**Alt text and caption do different jobs — do not write the same sentence twice.**

- **Alt** is the accessibility contract and the main Google Images signal. Describe the
  content plainly: _"Fishing boats moored in a still harbour under a pale morning sky"_.
  Never start with "Image of" or "Photo of". Never write only the title.
- **Caption** is the story, and it is the text that makes the per-photo page rank for
  anything. Say something only the photographer knows — the wait, the weather, why this
  frame. _"The fleet comes back in before the light gets hard."_

Ask the user for the real details rather than inventing them. You were not there, and a
fabricated caption is worse than none — it is on their portfolio under their name.

## 4. Collections

If a photo belongs to a new collection, add it to `content/collections.json`:
slug, title, `description` (min 40 chars — it doubles as the page meta description),
`location`, `coverPhotoSlug`, and `order`.

Every collection must contain at least one photo and its cover must exist, or the build
fails by design.

## 5. Verify

```bash
yarn verify
yarn build
```

A Zod error names the photo by slug and the offending field. Fix the content — never
loosen the schema to make an error go away.

## 6. Ship

Follow the `verify-and-ship` skill. Branch name: `content/add-<subject>-photos`.
