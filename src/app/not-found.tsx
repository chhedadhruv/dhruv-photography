import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
  // Keeps 404s out of the index even if one is somehow linked to.
  robots: { index: false, follow: true },
};

/**
 * An empty state is an invitation to act, so this points back to the work rather than
 * apologising. The frame-counter metaphor does the explaining.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[100rem] flex-col items-start px-6 py-32 md:px-10">
      <span className="rebate text-selenium">Frame 404</span>

      <h1 className="font-display text-paper mt-4 max-w-2xl text-4xl leading-tight font-light md:text-5xl">
        Nothing on this frame.
      </h1>

      <p className="text-dim mt-5 max-w-md text-lg leading-relaxed">
        The page you asked for does not exist, or the photograph has moved.
      </p>

      <Link
        href="/"
        className="rebate hover:text-paper border-rule mt-10 border-b pb-1 transition-colors"
      >
        Back to the frames
      </Link>
    </div>
  );
}
