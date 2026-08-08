import type { Metadata } from "next";
import Link from "next/link";

import { formatPostDate } from "@/lib/format";
import { getAllPosts } from "@/lib/journal";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes on travel, technique and the waiting involved — writing that goes alongside the photographs.",
  alternates: { canonical: "/journal" },
};

export default function JournalPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      <h1 className="font-display text-paper max-w-3xl text-4xl leading-tight font-light md:text-6xl">
        Journal
      </h1>

      {posts.length === 0 ? (
        <p className="rebate py-24 normal-case">Nothing written yet.</p>
      ) : (
        <ul className="border-rule mt-16 max-w-4xl border-t">
          {posts.map((post) => (
            <li key={post.slug} className="border-rule border-b">
              <Link
                href={`/journal/${post.slug}`}
                className="group block py-8 md:py-10"
              >
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <span className="rebate text-selenium">
                    {formatPostDate(post.publishedAt)}
                  </span>
                  {post.draft && <span className="rebate">Draft</span>}
                  {post.tags.length > 0 && (
                    <span className="rebate ml-auto">
                      {post.tags.join(" · ")}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-paper group-hover:text-selenium mt-3 max-w-3xl text-2xl leading-snug font-light transition-colors md:text-3xl">
                  {post.title}
                </h2>

                <p className="text-dim mt-3 max-w-2xl leading-relaxed">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
