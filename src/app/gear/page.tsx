import type { Metadata } from "next";

import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Gear",
  description:
    "The cameras, lenses and accessories behind the photographs — what I actually shoot with and why.",
  alternates: { canonical: "/gear" },
};

const CATEGORY_ORDER = ["Camera", "Lens", "Accessory"] as const;

/**
 * Gear pages earn their place with the photographer audience and pick up long-tail search
 * traffic for equipment names, which is why each item carries a note rather than sitting
 * in a bare list. The note is the part anyone actually wants to read.
 */
export default function GearPage() {
  return (
    <div className="mx-auto max-w-[100rem] px-6 pt-10 md:px-10 md:pt-16">
      <header className="max-w-3xl">
        <h1 className="font-display text-paper text-4xl leading-tight font-light md:text-6xl">
          Gear
        </h1>
        <p className="text-paper/85 mt-6 text-lg leading-relaxed">
          Every frame on this site records what it was shot with. This is the
          short version.
        </p>
      </header>

      <div className="mt-16 max-w-4xl">
        {CATEGORY_ORDER.map((category) => {
          const items = siteConfig.gear.filter(
            (item) => item.category === category,
          );

          if (items.length === 0) {
            return null;
          }

          return (
            <section key={category} className="mt-12 first:mt-0">
              <h2 className="rebate text-selenium border-rule border-b pb-3">
                {category === "Accessory" ? "Accessories" : `${category}s`}
              </h2>

              <ul>
                {items.map((item) => (
                  <li key={item.name} className="border-rule border-b py-5">
                    <h3 className="font-display text-paper text-xl font-light">
                      {item.name}
                    </h3>
                    <p className="text-dim mt-1.5 max-w-2xl leading-relaxed">
                      {item.note}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
