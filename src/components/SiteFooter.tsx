import { siteConfig } from "@/site.config";

export function SiteFooter() {
  return (
    <footer className="border-rule mt-32 border-t">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between md:px-10">
        <div className="max-w-sm">
          <p className="font-display text-paper text-xl leading-snug font-light">
            {siteConfig.author.name}
          </p>
          {/* View-only site, so the licensing line is the whole rights story. */}
          <p className="rebate mt-3 leading-relaxed normal-case">
            {siteConfig.copyright}
          </p>
        </div>

        <nav aria-label="Elsewhere">
          <ul className="flex flex-col gap-2 md:items-end">
            {siteConfig.socials.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  className="rebate hover:text-paper transition-colors"
                  // Outbound links open in a new tab; noreferrer for the usual reasons.
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
