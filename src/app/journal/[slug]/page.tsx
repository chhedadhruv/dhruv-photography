import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoImage } from "@/components/PhotoImage";
import { formatPostDate } from "@/lib/format";
import { getAllPosts, getPostBySlug } from "@/lib/journal";
import { getPhotoBySlug } from "@/lib/photos";

export function generateStaticParams(): { slug: string }[] {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  props: PageProps<"/journal/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);

  if (post === undefined) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      tags: [...post.tags],
    },
  };
}

export default async function JournalPostPage(
  props: PageProps<"/journal/[slug]">,
) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);

  if (post === undefined) {
    notFound();
  }

  const cover =
    post.coverPhotoSlug === undefined
      ? undefined
      : getPhotoBySlug(post.coverPhotoSlug);

  return (
    <article className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      <header className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <span className="rebate text-selenium">
            {formatPostDate(post.publishedAt)}
          </span>
          {post.tags.length > 0 && (
            <span className="rebate">{post.tags.join(" · ")}</span>
          )}
        </div>

        <h1 className="font-display text-paper mt-4 text-4xl leading-tight font-light md:text-5xl">
          {post.title}
        </h1>

        <p className="text-dim mt-5 text-lg leading-relaxed">
          {post.description}
        </p>
      </header>

      {cover !== undefined && (
        <figure className="mt-14">
          <Link href={`/photos/${cover.slug}`}>
            <PhotoImage
              photo={cover}
              sizes="(min-width: 1600px) 90rem, 100vw"
              priority
            />
          </Link>
          <figcaption className="border-rule mx-auto mt-2.5 max-w-3xl border-t pt-2.5">
            <span className="rebate">{cover.title}</span>
          </figcaption>
        </figure>
      )}

      {/* The markdown is rendered to HTML during the build, so the post's text is in the
          response body. Text in the markup is the entire reason a journal helps here. */}
      <div
        className="prose mx-auto mt-14 max-w-3xl"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
