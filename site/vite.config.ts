// The site (L4.12–L4.14): the home page, a page per package built from its README (one source for
// npm and the site), and the demo board (`playground/`, built into `demo/` by `npm run site:build`).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { marked, type Token } from "marked";
import { defineConfig, type Plugin } from "vite";

const REPO = "https://github.com/fabiomrosa/list-picker";
const SITE = new URL("./", import.meta.url);
/** The site's pages, by name: a package's page is one more `<name>.html` in `site/`. */
const PAGES = readdirSync(SITE)
  .filter((file) => file.endsWith(".html"))
  .map((file) => file.slice(0, -5));
const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

/** Links that leave the site go to GitHub; links to a package go to its page here, if it has one. */
function rewrite(dir: string) {
  return (token: Token) => {
    if (token.type !== "link") return;
    const href = token.href.replace(`${REPO}/tree/main/packages/`, "packages/");
    const name = /^packages\/([\w-]+)\/?$/.exec(href)?.[1];
    if (name)
      token.href = PAGES.includes(name) ? `${name}.html` : `${REPO}/tree/main/packages/${name}`;
    else if (href.startsWith("#running-locally")) token.href = `${REPO}#running-locally`;
    else if (!/^([a-z]+:|#)/.test(href)) token.href = `${REPO}/blob/main/${dir}${href}`;
  };
}

/**
 * A package's published version: npm's, read once per build, so the site never shows one that is not
 * installable yet (the repository can be ahead of npm); its `package.json` when npm does not answer.
 */
const published = new Map<string, Promise<string>>();
function version(name: string): Promise<string> {
  const local = () => JSON.parse(read(`packages/${name}/package.json`)).version as string;
  if (!published.has(name)) {
    published.set(
      name,
      fetch(`https://registry.npmjs.org/@list-picker/${name}/latest`, {
        signal: AbortSignal.timeout(3000),
      })
        .then(async (response) => (response.ok ? (await response.json()).version : local()))
        .catch(local),
    );
  }
  return published.get(name) as Promise<string>;
}

/** `<!-- version: <package> -->`: its published version, linked to its npm page. */
function versions(): Plugin {
  return {
    name: "versions",
    transformIndexHtml: async (html) => {
      const names = [...html.matchAll(/<!-- version: ([\w-]+) -->/g)].map((m) => m[1] as string);
      const found = new Map(
        await Promise.all(names.map(async (n) => [n, await version(n)] as const)),
      );
      return html.replace(/<!-- version: ([\w-]+) -->/g, (_m, name: string) => {
        const npm = `https://www.npmjs.com/package/@list-picker/${name}`;
        return `<a class="version" href="${npm}" title="@list-picker/${name} on npm">v${found.get(name)}</a>`;
      });
    },
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
        const sections: string[] = [];
        const out = body.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_h, level: string, inner: string) => {
          const id = inner
            .replace(/<[^>]+>|&[#\w]+;/g, "")
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
          if (level === "2") sections.push(`<li><a href="#${id}">${inner}</a></li>`);
          // A package's name wraps after its scope ("@list-picker/" then "vanilla"), not at a hyphen.
          const text =
            level === "1" ? inner.replace(/^(@[\w-]+\/)/, '<span class="scope">$1</span>') : inner;
          // A package's page shows its version under its name.
          const pkg = /^packages\/([\w-]+)\/README\.md$/.exec(file)?.[1];
          const after =
            level === "1" && pkg ? `<p class="version-line"><!-- version: ${pkg} --></p>` : "";
          return `<h${level} id="${id}">${text}</h${level}>${after}`;
        });
        // A whole README is a package's page: the index of its sections goes beside it.
        if (from) return out;
        const toc = `<strong aria-hidden="true">On this page</strong><ul>${sections.join("")}</ul>`;
        return `<aside class="toc" aria-label="On this page">${toc}</aside><article>${out}</article>`;
      }),
  };
}

export default defineConfig({
  base: "/list-picker/",
  plugins: [markdown(), versions()],
  build: {
    outDir: "../dist-site",
    emptyOutDir: true,
    rollupOptions: {
      // Every page in `site/`: a package's page is one more `<name>.html` here.
      input: Object.fromEntries(
        PAGES.map((name) => [name, fileURLToPath(new URL(`${name}.html`, SITE))]),
      ),
    },
  },
});
