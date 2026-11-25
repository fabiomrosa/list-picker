// The packages' names resolve to their source in tests (as `tsconfig.json`'s `paths` do for the
// types): a test never needs a build first, and never runs a stale `dist` (L5.3).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@list-picker/core": source("core"),
      "@list-picker/vanilla": source("vanilla"),
      "@list-picker/react": source("react"),
    },
  },
});
