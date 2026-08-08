import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makePhoto } from "@/lib/test-fixtures";

import { PhotoGrid } from "./PhotoGrid";

describe("PhotoGrid", () => {
  const photos = [
    makePhoto({ slug: "first", title: "First frame" }),
    makePhoto({ slug: "second", title: "Second frame" }),
    makePhoto({ slug: "third", title: "Third frame" }),
  ];

  it("renders every photo", () => {
    render(<PhotoGrid photos={photos} />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  // Grid images link to their own pages rather than opening a lightbox, which is what
  // gives every photograph a crawlable URL of its own.
  it("links each frame to its own page", () => {
    render(<PhotoGrid photos={photos} />);

    expect(screen.getByRole("link", { name: /First frame/ })).toHaveAttribute(
      "href",
      "/photos/first",
    );
  });

  it("gives every image its alt text", () => {
    render(<PhotoGrid photos={photos} />);

    for (const img of screen.getAllByRole("img")) {
      expect(img.getAttribute("alt")?.length).toBeGreaterThan(9);
    }
  });

  it("numbers frames from one", () => {
    render(<PhotoGrid photos={photos} />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  // The home page shows a lead frame above the grid, so the grid has to continue that
  // sequence rather than restarting at 01.
  it("continues the sequence when a lead frame precedes it", () => {
    render(<PhotoGrid photos={photos} startIndex={1} />);

    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.queryByText("01")).not.toBeInTheDocument();
  });

  it("shows an empty state rather than an empty page", () => {
    render(<PhotoGrid photos={[]} />);

    expect(screen.getByText(/No photographs here yet/)).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  // The EXIF has to be in the markup whether or not anyone hovers, because that is what
  // makes it useful to a crawler as well as a reader.
  it("renders shooting data as text in the markup", () => {
    render(<PhotoGrid photos={[makePhoto()]} />);

    expect(
      screen.getByText("23mm · f/2 · 1/250 · ISO 200"),
    ).toBeInTheDocument();
  });
});
