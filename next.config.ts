import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating dev overlay in the corner. It only ever renders under `next dev`,
  // never in a production build, but it sits on top of full-bleed photographs and makes
  // judging a layout harder than it needs to be. Compile and runtime errors are still
  // surfaced normally.
  devIndicators: false,
};

export default nextConfig;
