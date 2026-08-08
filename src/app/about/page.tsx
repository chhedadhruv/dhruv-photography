import type { Metadata } from "next";

import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "About",
  description: siteConfig.author.bio,
  alternates: { canonical: "/about" },
};

/**
 * The page most likely to rank for the owner's name, which is a stated goal -- so the
 * bio is real prose rather than a caption, and the outbound links are the ones that
 * connect this site to the rest of his presence.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,42rem)_minmax(0,20rem)]">
        <div>
          <h1 className="font-display text-paper text-4xl leading-tight font-light md:text-6xl">
            {siteConfig.author.name}
          </h1>

          <p className="rebate border-rule text-selenium mt-5 border-t pt-3">
            {siteConfig.tagline}
          </p>

          <p className="text-paper/85 mt-10 text-lg leading-relaxed">
            {siteConfig.author.bio}
          </p>
        </div>

        <aside>
          <h2 className="rebate text-selenium">Elsewhere</h2>
          <ul className="border-rule mt-4 border-t">
            {siteConfig.socials.map((social) => (
              <li key={social.href} className="border-rule border-b">
                <a
                  href={social.href}
                  target="_blank"
                  rel="me noreferrer"
                  className="font-display hover:text-selenium block py-3 text-lg font-light transition-colors"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
