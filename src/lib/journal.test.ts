import { describe, expect, it } from "vitest";

import {
  parsePostSource,
  renderMarkdown,
  sortPosts,
  type JournalPostMeta,
} from "./journal";
import { ContentValidationError } from "./schema";

const FRONTMATTER = `---
title: Waiting for the light
description: On the unglamorous part of landscape photography and the waiting it involves.
publishedAt: 2025-02-10
tags:
  - landscape
  - technique
---

The body starts here.
`;

describe("parsePostSource", () => {
  it("separates frontmatter from body", () => {
    const { frontmatter, body } = parsePostSource(FRONTMATTER, "test.md");

    expect(frontmatter.title).toBe("Waiting for the light");
    expect(frontmatter.tags).toEqual(["landscape", "technique"]);
    expect(body.trim()).toBe("The body starts here.");
  });

  /**
   * The bug that broke the first real build. YAML parses an unquoted `2025-02-10` into a
   * Date object, so the value never arrives as the string it looks like. Both forms have
   * to normalise to the same date string, or writing a post becomes a memory game about
   * quoting.
   */
  it("accepts an unquoted YAML date, which arrives as a Date", () => {
    const { frontmatter } = parsePostSource(FRONTMATTER, "test.md");
    expect(frontmatter.publishedAt).toBe("2025-02-10");
  });

  it("accepts a quoted date and normalises it identically", () => {
    const quoted = FRONTMATTER.replace(
      "publishedAt: 2025-02-10",
      'publishedAt: "2025-02-10"',
    );
    expect(parsePostSource(quoted, "test.md").frontmatter.publishedAt).toBe(
      "2025-02-10",
    );
  });

  it("defaults draft to false", () => {
    expect(parsePostSource(FRONTMATTER, "test.md").frontmatter.draft).toBe(
      false,
    );
  });

  it("reads an explicit draft flag", () => {
    const draft = FRONTMATTER.replace("tags:", "draft: true\ntags:");
    expect(parsePostSource(draft, "test.md").frontmatter.draft).toBe(true);
  });

  it("rejects a description too short to serve as a search snippet", () => {
    const thin = FRONTMATTER.replace(
      /description: .*/,
      "description: Some notes.",
    );
    expect(() => parsePostSource(thin, "test.md")).toThrow(
      ContentValidationError,
    );
  });

  it("names the file in the error so you know which post to open", () => {
    const broken = FRONTMATTER.replace(/title: .*/, "title: ''");
    expect(() => parsePostSource(broken, "content/journal/broken.md")).toThrow(
      /content\/journal\/broken\.md/,
    );
  });
});

function makePost(overrides: Partial<JournalPostMeta> = {}): JournalPostMeta {
  return {
    slug: "a-post",
    title: "A post",
    description:
      "A description long enough to satisfy the schema minimum for meta descriptions.",
    publishedAt: "2025-01-01",
    tags: [],
    draft: false,
    ...overrides,
  };
}

describe("sortPosts", () => {
  it("puts the newest post first", () => {
    const sorted = sortPosts([
      makePost({ slug: "older", publishedAt: "2024-06-01" }),
      makePost({ slug: "newer", publishedAt: "2025-06-01" }),
    ]);

    expect(sorted.map((post) => post.slug)).toEqual(["newer", "older"]);
  });

  // Two posts published the same day must not swap between builds.
  it("breaks same-day ties deterministically on slug", () => {
    const sorted = sortPosts([
      makePost({ slug: "zebra", publishedAt: "2025-03-03" }),
      makePost({ slug: "alpha", publishedAt: "2025-03-03" }),
    ]);

    expect(sorted.map((post) => post.slug)).toEqual(["alpha", "zebra"]);
  });

  it("does not mutate the array it was given", () => {
    const posts = [
      makePost({ slug: "older", publishedAt: "2024-06-01" }),
      makePost({ slug: "newer", publishedAt: "2025-06-01" }),
    ];
    sortPosts(posts);
    expect(posts.map((post) => post.slug)).toEqual(["older", "newer"]);
  });
});

describe("renderMarkdown", () => {
  // Rendering at build time is the entire reason the journal helps: text that only exists
  // after JavaScript runs is text a crawler may never see.
  it("renders headings and paragraphs to HTML", async () => {
    const html = await renderMarkdown("## A heading\n\nSome prose.");

    expect(html).toContain("<h2>A heading</h2>");
    expect(html).toContain("<p>Some prose.</p>");
  });

  it("supports GitHub-flavoured tables and strikethrough", async () => {
    const html = await renderMarkdown(
      "| a | b |\n| - | - |\n| 1 | 2 |\n\n~~gone~~",
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<del>gone</del>");
  });

  it("renders links and lists", async () => {
    const html = await renderMarkdown(
      "- one\n- two\n\n[a link](https://x.com)",
    );

    expect(html).toContain("<li>one</li>");
    expect(html).toContain('href="https://x.com"');
  });
});
