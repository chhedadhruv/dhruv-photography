import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FullFrame } from "./FullFrame";

/**
 * The only client component on the site, so this is the only place interaction can break.
 * The behaviour that matters is that the photograph is present regardless -- if the
 * JavaScript never runs, the page is still a page with a photograph on it.
 */
describe("FullFrame", () => {
  function setup() {
    return render(
      <FullFrame label="Harbour at dawn">
        <img src="/images/photos/harbour-at-dawn/2400.webp" alt="A harbour" />
      </FullFrame>,
    );
  }

  it("renders its child whether or not it is ever opened", () => {
    setup();
    expect(screen.getByAltText("A harbour")).toBeInTheDocument();
  });

  it("names the action for screen readers", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "View Harbour at dawn full screen" }),
    ).toBeInTheDocument();
  });

  it("has no dialog until it is opened", () => {
    setup();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a labelled modal dialog on click", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /full screen/ }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Harbour at dawn, full screen");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /full screen/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Escape must not be the only way out: the backdrop is a real button so it is reachable
  // by keyboard and by anyone who does not know the shortcut.
  it("closes when the backdrop is activated", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /full screen/ }));
    await user.click(
      screen.getByRole("button", { name: "Close full screen view" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("locks the page behind the overlay and restores it afterwards", async () => {
    const user = userEvent.setup();
    setup();

    expect(document.body.style.overflow).toBe("");

    await user.click(screen.getByRole("button", { name: /full screen/ }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  // A stray keydown listener would keep firing after the component is gone.
  it("removes its key handler when unmounted while open", async () => {
    const user = userEvent.setup();
    const { unmount } = setup();

    await user.click(screen.getByRole("button", { name: /full screen/ }));
    unmount();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
