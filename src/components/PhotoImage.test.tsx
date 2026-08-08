import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makePhoto } from "@/lib/test-fixtures";

import { PhotoImage } from "./PhotoImage";

describe("PhotoImage", () => {
  it("uses the photo's alt text", () => {
    render(<PhotoImage photo={makePhoto()} sizes="100vw" />);

    expect(
      screen.getByAltText(
        "Fishing boats moored in a still harbour under a pale morning sky",
      ),
    ).toBeInTheDocument();
  });

  /**
   * Intrinsic dimensions are the entire defence against layout shift. Without them the
   * browser reserves nothing and the page jumps when each photograph decodes -- on a site
   * that is mostly photographs, that is the difference between a good CLS score and a
   * terrible one.
   */
  it("sets intrinsic width and height so space is reserved", () => {
    render(
      <PhotoImage
        photo={makePhoto({ width: 4000, height: 2667 })}
        sizes="100vw"
      />,
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "4000");
    expect(img).toHaveAttribute("height", "2667");
  });

  it("offers AVIF before WebP so the smaller format wins", () => {
    const { container } = render(
      <PhotoImage photo={makePhoto()} sizes="100vw" />,
    );

    const sources = container.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("type", "image/avif");
    expect(sources[1]).toHaveAttribute("type", "image/webp");
  });

  it("advertises only the widths the photo actually has", () => {
    const { container } = render(
      <PhotoImage
        photo={makePhoto({ derivativeWidths: [400, 800] })}
        sizes="100vw"
      />,
    );

    const srcset = container.querySelector("source")?.getAttribute("srcset");
    expect(srcset).toContain("400w");
    expect(srcset).toContain("800w");
    expect(srcset).not.toContain("2400w");
  });

  it("passes the sizes attribute through to every source", () => {
    const { container } = render(
      <PhotoImage photo={makePhoto()} sizes="(min-width: 768px) 46vw, 92vw" />,
    );

    for (const source of container.querySelectorAll("source")) {
      expect(source).toHaveAttribute("sizes", "(min-width: 768px) 46vw, 92vw");
    }
  });

  // Exactly one image per page should be eager. Marking several defeats the point,
  // because the browser then cannot tell which one is the LCP candidate.
  it("lazy-loads by default and loads eagerly only when asked", () => {
    const { unmount } = render(
      <PhotoImage photo={makePhoto()} sizes="100vw" />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    unmount();

    render(<PhotoImage photo={makePhoto()} sizes="100vw" priority />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("paints the pipeline's blur placeholder behind the image", () => {
    render(<PhotoImage photo={makePhoto()} sizes="100vw" />);

    expect(screen.getByRole("img").style.backgroundImage).toContain(
      "data:image/webp;base64",
    );
  });
});
