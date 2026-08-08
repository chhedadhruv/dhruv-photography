---
name: write-journal-post
description: Create or edit a journal post — valid frontmatter, SEO-shaped description, correct file location and slug. Use when the user wants to write, draft, or publish a journal entry, blog post, trip write-up, or technique note.
---

# Writing a journal post

The journal is the strongest SEO asset on this site. Photographs cannot be read by a
search engine; prose can. A post that pulls someone in for a technique question and
leaves them looking at the galleries is doing work no gallery page can do alone.

## File

`content/journal/<slug>.md` — the filename **is** the slug and the URL. Lowercase
kebab-case only; anything else is silently ignored by the loader.

Prefer a slug that reads as a search query: `shooting-blue-hour-in-mumbai` rather than
`post-3` or `january-update`.

## Frontmatter

```markdown
---
title: Three mornings on the Konkan coast
description: Notes from a week of getting up before sunrise, and what it taught me about waiting for the light.
publishedAt: 2025-02-01
tags:
  - travel
  - landscape
coverPhotoSlug: harbour-at-dawn
draft: false
---
```

| Field            | Rule                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`          | Required.                                                                                                                                   |
| `description`    | Required, **min 40 characters** — it is the meta description and the search result snippet. Write it for a human deciding whether to click. |
| `publishedAt`    | Required. **Date only** (`YYYY-MM-DD`) — a full timestamp is rejected.                                                                      |
| `tags`           | Required array. May be empty, but topical tags help.                                                                                        |
| `coverPhotoSlug` | Optional. Must match a photo in `content/photos.json`.                                                                                      |
| `draft`          | Optional, defaults `false`. Drafts render in `yarn dev` and are excluded from production builds and the sitemap.                            |

Use `draft: true` for work in progress — it lets the user preview locally without the
post reaching the live site.

## Body

Markdown with GFM, rendered to HTML **at build time** so the text is in the response
markup. That is the entire point; text that only appears after JavaScript runs does not
help.

- Open with something concrete, not a throat-clearing preamble.
- Use `##` headings for real sections — they structure the page for readers and crawlers
  alike. Never use `#`; the page title is already the `<h1>`.
- Reference photos by their slug when the user wants them embedded, and check the slug
  exists first.

**Write in the user's voice, not marketing copy.** This is a personal journal by a
hobbyist photographer. Plain, specific, first-person. If you lack the actual details of
a trip or a shoot, ask — do not invent experiences and publish them under their name.

## Verify

```bash
yarn verify
yarn dev      # check the post renders at /journal/<slug>
```

Frontmatter errors name the file and the field.

## Ship

Follow the `verify-and-ship` skill. Branch name: `content/journal-<slug>`.
