---
name: add-photos
description: Publish new photographs to the site — analyse the frames, run the ingest pipeline, write alt text, propose captions, assign collections, and verify. Use whenever the user wants to add, publish, or ingest photos, or mentions dropping files into originals/.
---

# Adding photos

The pipeline handles everything technical. Your job is the words — which is the part
that decides whether the photo's page is worth having.

## 1. Look at the photographs

`Read` the files in `originals/` — they render, and you can see them. Do this before
anything else. It is what makes a real title and real alt text possible, and it catches
things a filename never tells you.

Also read the EXIF before ingesting, so you know what you are working with:

```bash
node -e "require('exifr').parse('originals/FILE.jpg',{gps:true}).then(d=>console.log(d))"
```

Timestamps, focal length and ISO are all legitimate caption material. GPS is usually
absent — the pipeline does not extract it, so location always comes from the user.

**What you can see and what you cannot.** You can describe the contents of a frame
accurately. You cannot identify a dish, a place or a person from looking at it — a
confident guess is still a guess. A previous session called burrata "mozzarella" in alt
text and shipped it. Ask.

## 2. Rename before ingesting

`slugFromFilename()` turns the filename into the slug, which becomes the URL and the R2
key **permanently**. `IMG_0238.JPG` gives you `img-0238`.

Rename originals to something readable first, and show the user the mapping before you
run ingest — renaming afterwards means re-ingesting with `--force` and orphaned keys left
in the bucket.

Do not put a claim in a slug that you cannot support. `oven-at-closing-time` was invented
from a late timestamp and is now a permanent URL asserting something nobody verified.

## 3. Ingest

```bash
yarn ingest --local     # before R2 credentials exist
yarn ingest             # once R2 is configured
```

**If `NEXT_PUBLIC_IMAGE_BASE_URL` is `/images`, run both.** Ingesting only to R2 leaves
`public/images/` empty and every frame broken in local dev. The two runs are cheap and
the second carries the editorial text forward untouched.

Already-ingested files are skipped. Add `--force` only when a photo has been re-edited
and needs re-encoding. Ingest prints exactly which photos still need copy.

**Never hand-edit the technical fields** — `width`, `height`, `derivativeWidths`,
`blurDataUrl`, `exif`, `capturedAt`, `sourceFile`. They are derived, and `--force`
overwrites them.

## 4. Write the copy

Edit `content/photos.json`. For each new photo fill in:

| Field         | Standard                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | Short, specific. Ingest guesses it from the filename — that guess is almost always wrong.                                                     |
| `alt`         | **Required, min 10 chars.** Describe what is _in_ the frame for someone who cannot see it.                                                    |
| `caption`     | **Required.** A sentence or two of actual observation.                                                                                        |
| `location`    | Human-readable. Prefer a neighbourhood — `"HSR Layout, Bengaluru"` beats `"Bengaluru, India"` for search. `null` only if genuinely placeless. |
| `collections` | Array of existing collection slugs.                                                                                                           |
| `featured`    | `true` only for genuinely strongest work.                                                                                                     |

**Alt text and caption do different jobs — do not write the same sentence twice.**

- **Alt** is yours to write. You can see the frame, so describe its content plainly:
  _"Fishing boats moored in a still harbour under a pale morning sky"_. Never start with
  "Image of" or "Photo of". Never write only the title.
- **Caption** is the story, and it is the text that makes the per-photo page rank for
  anything. It is not yours to invent.

### How to write captions

Do not write one caption and ship it. Do not leave them blank either. Instead:

1. Draft **two or three options per photo**, grounded only in what the frame and the EXIF
   actually show — the light, the exposure, the composition, what is visibly in shot.
2. Offer them to the user and let them pick, with the note that anything they can add
   about the day will beat all three.
3. Rewrite from whatever they tell you.

Never assert why the shutter was pressed, who was there, what something tasted like, or
what the photographer was thinking. You were not there. A fabricated caption is worse
than a thin one — it is on their portfolio under their name.

If they hand you real details, use them and drop the drafts. That is always the better
post.

## 5. People in frame

If a photograph shows a recognisable person who is not the user, raise it before
publishing. Ask whether they were asked, and whether the user wants the frame published,
held back, or published without a location tag. This is their call, not yours, but it is
your job to surface it rather than quietly shipping a stranger's face.

## 6. Collections

If a photo belongs to a new collection, add it to `content/collections.json`:
slug, title, `description` (min 40 chars — it doubles as the page meta description),
`location`, `coverPhotoSlug`, and `order`.

Every collection must contain at least one photo and its cover must exist, or the build
fails by design.

## 7. Removing photos

Deleting a photo is never just a photo. Before removing entries, grep for the slug:

```bash
grep -rn '<slug>' content/ src/ .claude/
```

Covers (`coverPhotoSlug`) in `content/collections.json` and in journal frontmatter both
point at photo slugs, and both fail the build when the target disappears. Removing files
from `originals/` is enough to drop the entries — ingest rebuilds `photos.json` from
whatever is on disk — but the references have to be fixed by hand.

## 8. Verify

```bash
yarn verify
yarn build
```

A Zod error names the photo by slug and the offending field. Fix the content — never
loosen the schema to make an error go away.

## 9. Ship

Follow the `verify-and-ship` skill. Branch name: `content/add-<subject>-photos`.
