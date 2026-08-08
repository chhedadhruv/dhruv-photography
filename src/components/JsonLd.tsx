import type { JsonLd as JsonLdNode } from "@/lib/jsonld";

/**
 * Emits a structured-data script tag.
 *
 * `<` is escaped to its unicode form because `JSON.stringify` does not sanitise strings
 * for HTML: a caption containing `</script>` would otherwise close the tag early and
 * inject whatever followed. Captions are content the author writes, but content is
 * exactly the sort of thing that eventually contains an angle bracket.
 */
export function JsonLd({ data }: { readonly data: JsonLdNode }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
