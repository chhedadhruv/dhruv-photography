import Link from "next/link";

import { siteConfig } from "@/site.config";

const NAV = [
  { href: "/", label: "Frames" },
  { href: "/collections", label: "Collections" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/gear", label: "Gear" },
] as const;

/**
 * The wordmark sets the name in the display serif with the discipline printed beneath in
 * rebate type -- the same relationship a photograph has to its edge printing, which is
 * the device the whole site is built on.
 */
export function SiteHeader() {
  return (
    <header className="border-rule bg-ink/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-end justify-between gap-x-8 gap-y-4 px-6 py-5 md:px-10">
        <Link href="/" className="group block">
          <span className="font-display text-paper block text-2xl leading-none font-light tracking-tight">
            {siteConfig.author.name}
          </span>
          <span className="rebate group-hover:text-selenium mt-1.5 block transition-colors">
            Photography
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rebate hover:text-paper transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
