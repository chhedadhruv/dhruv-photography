"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * The only client component on the site.
 *
 * Everything else renders to static HTML, so this is the one place JavaScript is worth
 * shipping: letting a visitor take a photograph full-screen without the page chrome. On a
 * photography site that is a real need rather than a flourish -- the image is the content,
 * and the browser gives no other way to see it uninterrupted.
 *
 * It wraps the already-rendered image rather than fetching anything, so the photo is
 * present in the markup whether or not this ever hydrates. If the JavaScript fails, the
 * page is still a page with a photograph on it.
 */
export function FullFrame({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Stops the page behind the overlay from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        // `zoom-in` promises the click does something; without it the image looks inert.
        className="block w-full cursor-zoom-in"
        aria-label={`View ${label} full screen`}
      >
        {children}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label}, full screen`}
          className="bg-ink/97 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm md:p-10"
        >
          {/* The backdrop is a real button so Escape is not the only way out, and so the
              click target is reachable by keyboard rather than being a bare div. */}
          <button
            type="button"
            onClick={close}
            aria-label="Close full screen view"
            className="absolute inset-0 cursor-zoom-out"
          />

          <div className="pointer-events-none relative max-h-full max-w-[110rem] [&_img]:max-h-[88vh] [&_img]:w-auto [&_img]:object-contain">
            {children}
          </div>

          <span className="rebate absolute bottom-6 left-1/2 -translate-x-1/2">
            Esc to close
          </span>
        </div>
      )}
    </>
  );
}
