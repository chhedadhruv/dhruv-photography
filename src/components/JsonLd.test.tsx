import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("emits a structured-data script tag", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "Person", name: "Dhruv Chheda" }} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();
    expect(JSON.parse(script?.textContent ?? "{}")).toEqual({
      "@type": "Person",
      name: "Dhruv Chheda",
    });
  });

  /**
   * `JSON.stringify` does not escape for HTML. A caption containing `</script>` would
   * otherwise close the tag early and turn whatever followed into live markup -- captions
   * are content the author writes, and content eventually contains an angle bracket.
   */
  it("escapes angle brackets so content cannot close the script tag", () => {
    const { container } = render(
      <JsonLd data={{ caption: "</script><img src=x onerror=alert(1)>" }} />,
    );

    const html = container.innerHTML;
    expect(html).not.toContain("</script><img");
    expect(html).toContain("\\u003c");
    // One script element, not a script plus an injected image.
    expect(container.querySelectorAll("script")).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps the escaped payload valid JSON with the original text intact", () => {
    const { container } = render(
      <JsonLd data={{ caption: "a < b and </script>" }} />,
    );

    const parsed: unknown = JSON.parse(
      container.querySelector("script")?.textContent ?? "{}",
    );
    expect(parsed).toEqual({ caption: "a < b and </script>" });
  });
});
