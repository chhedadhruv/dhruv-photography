import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makePhoto } from "@/lib/test-fixtures";

import { ExifPanel } from "./ExifPanel";

const NO_EXIF = {
  camera: null,
  lens: null,
  focalLength: null,
  aperture: null,
  shutter: null,
  iso: null,
};

describe("ExifPanel", () => {
  it("lists the full shooting record", () => {
    render(<ExifPanel photo={makePhoto()} />);

    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Fujifilm X-T30")).toBeInTheDocument();
    expect(screen.getByText("f/2")).toBeInTheDocument();
    expect(screen.getByText("1/250")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  // A description list, not a styled table: these are term/value pairs and screen readers
  // should announce them as such.
  it("uses a description list", () => {
    const { container } = render(<ExifPanel photo={makePhoto()} />);

    expect(container.querySelector("dl")).toBeInTheDocument();
    expect(container.querySelectorAll("dt").length).toBeGreaterThan(0);
  });

  // Showing "--" tells a visitor nothing except that the site tried.
  it("omits rows with no value instead of showing placeholders", () => {
    render(
      <ExifPanel
        photo={makePhoto({ exif: { ...NO_EXIF, iso: 200 }, location: null })}
      />,
    );

    expect(screen.getByText("ISO")).toBeInTheDocument();
    expect(screen.queryByText("Camera")).not.toBeInTheDocument();
    expect(screen.queryByText("Lens")).not.toBeInTheDocument();
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByText("--")).not.toBeInTheDocument();
  });

  it("renders nothing at all when there is no data to show", () => {
    const { container } = render(
      <ExifPanel
        photo={makePhoto({
          exif: NO_EXIF,
          location: null,
          capturedAt: null,
        })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the location, which is the site's place-search surface", () => {
    render(<ExifPanel photo={makePhoto({ location: "Bandra, Mumbai" })} />);

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Bandra, Mumbai")).toBeInTheDocument();
  });
});
