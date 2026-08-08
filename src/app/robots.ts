import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * Crawler rules.
 *
 * Everything is allowed. This is a public portfolio with no admin surface, no search
 * results to waste a crawl budget on, and no duplicate URLs -- there is nothing to hide,
 * and a `Disallow` here would only ever be a mistake.
 *
 * Blocking `/_next/static/` is a common reflex and a bad one: Google renders pages, and a
 * crawler that cannot fetch the CSS sees an unstyled page and judges it accordingly.
 */
export default function robots(): MetadataRoute.Robots {
  // No `host` directive: it is a Yandex-only extension that Google ignores, and it only
  // repeats what the sitemap URL already says.
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
