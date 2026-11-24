// The site (L4.12, L4.14): the home page, a page per package built from its README (one source for
// npm and the site), and the demo board (`playground/`, built into `demo/` by `npm run site:build`).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { marked, type Token } from "marked";
import { defineConfig, type Plugin } from "vite";

const REPO = "https://github.com/fabiomrosa/list-picker";
const SITE = new URL("./", import.meta.url);
const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

/** Links that leave the site go to GitHub; links to a package go to its page here. */
function rewrite(dir: string) {
  return (token: Token) => {
    if (token.type !== "link") return;
    const href = token.href.replace(`${REPO}/tree/main/packages/`, "packages/");
    if (/^packages\/[\w-]+\/?$/.test(href)) token.href = `${href.split("/")[1]}.html`;
    else if (href.startsWith("#running-locally")) token.href = `${REPO}#running-locally`;
    else if (!/^([a-z]+:|#)/.test(href)) token.href = `${REPO}/blob/main/${dir}${href}`;
  };
}

/** `<!-- markdown: <file> [<from heading>] -->`: the file (or the section from that heading). */
function markdown(): Plugin {
  return {
    name: "markdown",
    transformIndexHtml: (html) =>
      html.replace(/<!-- markdown: (\S+)(?: "([^"]+)")? -->/g, (_, file: string, from?: string) => {
        let text = read(file);
        if (from) {
          const start = text.indexOf(from);
          // A renamed heading must fail the build, not leave the page without its section.
          if (start < 0) throw new Error(`${file}: no "${from}"`);
          const end = text.indexOf("\n## ", start + from.length);
          text = text.slice(start, end < 0 ? undefined : end);
        }
        const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
        const body = marked.parse(text, { async: false, walkTokens: rewrite(dir) });
        // Ids as GitHub gives them, so the READMEs' own `#section` links work here too.
        return body.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_h, level: string, inner: string) => {
          const id = inner
            .replace(/<[^>]+>|&[#\w]+;/g, "")
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
          return `<h${level} id="${id}">${inner}</h${level}>`;
        });
      }),
  };
}

export default defineConfig({
  base: "/list-picker/",
  plugins: [markdown()],
  build: {
    outDir: "../dist-site",
    emptyOutDir: true,
    rollupOptions: {
      // Every page in `site/`: a package's page is one more `<name>.html` here.
      input: Object.fromEntries(
        readdirSync(SITE)
          .filter((file) => file.endsWith(".html"))
          .map((file) => [file.slice(0, -5), fileURLToPath(new URL(file, SITE))]),
      ),
    },
  },
});
