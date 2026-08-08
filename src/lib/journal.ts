import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { JOURNAL_DIR } from "./content-dir";
import {
  ContentValidationError,
  journalFrontmatterSchema,
  parseContent,
  type JournalFrontmatter,
} from "./schema";

/**
 * The journal: markdown files in `content/journal/`, rendered to HTML at build time.
 *
 * Rendering happens during the build rather than in the browser so posts are plain HTML in
 * the response. That is the whole point of having a journal on this site -- text is what
 * search engines can actually rank, and it only counts if it is in the markup.
 */

export interface JournalPostMeta extends JournalFrontmatter {
  readonly slug: string;
}

export interface JournalPost extends JournalPostMeta {
  /** Rendered HTML body, ready for `dangerouslySetInnerHTML`. */
  readonly html: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Drafts are visible while developing and hidden in production builds, so you can preview
 * an unfinished post with `yarn dev` without it reaching the live site or the sitemap.
 */
function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

function readPostFile(slug: string): {
  frontmatter: JournalFrontmatter;
  body: string;
} {
  const source = `content/journal/${slug}.md`;
  const filePath = path.join(JOURNAL_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new ContentValidationError(source, "File does not exist.");
  }

  // gray-matter types `data` as `any`. Annotating the destructure narrows it to `unknown`
  // at this one boundary, and Zod turns it into a real type on the next line -- "parse it,
  // don't cast it" in practice.
  const { data, content }: { data: unknown; content: string } = matter(
    fs.readFileSync(filePath, "utf8"),
  );

  return {
    frontmatter: parseContent(journalFrontmatterSchema, data, source),
    body: content,
  };
}

/** Slugs of every markdown file present, drafts included. */
function listAllSlugs(): readonly string[] {
  if (!fs.existsSync(JOURNAL_DIR)) {
    return [];
  }
  return fs
    .readdirSync(JOURNAL_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.basename(name, ".md"))
    .filter((slug) => SLUG_PATTERN.test(slug))
    .sort();
}

/**
 * Post metadata, newest first, without rendering any markdown.
 *
 * Kept separate from `getPostBySlug` so listing pages and the sitemap do not pay to render
 * every post body just to show a list of titles.
 */
export function getAllPosts(): readonly JournalPostMeta[] {
  const posts = listAllSlugs().map((slug) => ({
    slug,
    ...readPostFile(slug).frontmatter,
  }));

  return posts
    .filter((post) => includeDrafts() || !post.draft)
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
        a.slug.localeCompare(b.slug),
    );
}

async function renderMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return file.toString();
}

/** A single post with its body rendered. Returns `undefined` for unknown slugs. */
export async function getPostBySlug(
  slug: string,
): Promise<JournalPost | undefined> {
  if (!listAllSlugs().includes(slug)) {
    return undefined;
  }

  const { frontmatter, body } = readPostFile(slug);
  if (frontmatter.draft && !includeDrafts()) {
    return undefined;
  }

  return { slug, ...frontmatter, html: await renderMarkdown(body) };
}
