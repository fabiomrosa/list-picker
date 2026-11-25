// The playground (L3.3): a page to try the model by hand, and the drag tests' page; served by
// `npm run dev`, built into the site's `demo/`; it takes the site's nav.
import { defineConfig } from "vite";
import { nav } from "../site/vite.config.ts";

export default defineConfig({ plugins: [nav()] });
