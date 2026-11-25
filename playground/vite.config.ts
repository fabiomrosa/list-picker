// The playground (the vanilla Board demo, L3.3): served by `npm run dev`, built into the site's
// `demo/`; it takes the site's nav.
import { defineConfig } from "vite";
import { nav } from "../site/vite.config.ts";

export default defineConfig({ plugins: [nav()] });
