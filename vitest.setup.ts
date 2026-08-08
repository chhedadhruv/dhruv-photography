// Registers jest-dom's matchers (`toBeInTheDocument`, `toHaveAttribute`, ...) on Vitest's
// `expect`, and augments its types so the matchers type-check.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not auto-cleanup when `globals` is disabled, so unmount between tests to
// keep the DOM from leaking state across them.
afterEach(() => {
  cleanup();
});
