import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// `.mts` rather than `.ts` so Vite loads this as ESM natively -- as `.ts` it is treated as
// CommonJS and warns about the ESM syntax below.
//
// Two projects rather than one, because the two kinds of code under test want genuinely
// different environments: the content/pipeline logic is plain Node (it touches the
// filesystem and image buffers), while components need a DOM. Running the Node tests in
// jsdom would be slower and would quietly hide Node-only mistakes.
export default defineConfig({
  test: {
    // Each project starts out empty and gains tests as its phase lands; an empty project
    // should not fail the gate before its code exists.
    passWithNoTests: true,
    projects: [
      {
        // Resolves the `@/*` alias from tsconfig. Vite does this natively now, so the
        // vite-tsconfig-paths plugin is not needed.
        resolve: { tsconfigPaths: true },
        test: {
          name: "node",
          environment: "node",
          include: ["src/lib/**/*.test.ts", "pipeline/**/*.test.ts"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        plugins: [react()],
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/components/**/*.test.tsx"],
        },
      },
    ],
  },
});
