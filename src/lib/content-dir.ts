import path from "node:path";

/**
 * Content lives outside `src/` because it is data, not code -- it is written by the ingest
 * pipeline and by hand, and reviewed as diffs.
 *
 * `process.cwd()` is the project root under both `next build` and Vitest, which is why
 * this resolves the same way in the app and in tests.
 */
export const CONTENT_DIR = path.join(process.cwd(), "content");

export const JOURNAL_DIR = path.join(CONTENT_DIR, "journal");
