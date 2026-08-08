import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / vendored:
    "coverage/**",
    "public/images/**",
  ]),

  // Makes "no suppression comments" enforceable instead of aspirational:
  // `noInlineConfig` causes ESLint to ignore `eslint-disable` comments entirely, so
  // adding one silences nothing. `@ts-ignore` is separately banned by
  // `@typescript-eslint/ban-ts-comment`, which `strictTypeChecked` turns on below.
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },

  ...nextVitals,
  ...nextTs,

  // Type-aware linting. `projectService` hands the rules a real TypeScript program, which
  // is what makes rules like `no-floating-promises` and `no-unsafe-assignment` possible --
  // they cannot be decided from syntax alone. Applied to `src/` and `pipeline/` alike.
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // The ingest pipeline is a CLI: writing to stdout is its user interface, not a stray
  // debug statement. Everything else stays as strict as the site code.
  {
    files: ["pipeline/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
