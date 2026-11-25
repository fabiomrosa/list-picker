// The site (L4.12–L4.14): the home page, a page per package built from its README (one source for
// npm and the site), the demos (a page each), and the playground (`playground/`, built into `demo/`
// by `npm run site:build`).
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
    const [, name, section = ""] = /^packages\/([\w-]+)\/?(#[\w-]+)?$/.exec(href) ?? [];
    if (name)
      token.href = PAGES.includes(name)
        ? `${name}.html${section}`
        : `${REPO}/tree/main/packages/${name}${section}`;
    else if (href.startsWith("#running-locally")) token.href = `${REPO}#running-locally`;
    else if (!/^([a-z]+:|#)/.test(href)) token.href = `${REPO}/blob/main/${dir}${href}`;
  };
}

/**
 * A package's published version: npm's, read once per build, so the site never shows one that is not
 * installable yet (the repository can be ahead of npm); its `package.json` when npm does not answer;
 * none (`null`) when npm says it is not published.
 */
const published = new Map<string, Promise<string | null>>();
function version(name: string): Promise<string | null> {
  const local = () => JSON.parse(read(`packages/${name}/package.json`)).version as string;
  if (!published.has(name)) {
    published.set(
      name,
      fetch(`https://registry.npmjs.org/@list-picker/${name}/latest`, {
        signal: AbortSignal.timeout(3000),
      })
        .then(async (response) => {
          if (response.status === 404) return null; // not on npm yet: no version to show
          // Only a version goes into the page: anything else (a broken or tampered answer) is ignored.
          const found = response.ok ? (await response.json()).version : undefined;
          return typeof found === "string" && /^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(found)
            ? found
            : local();
        })
        .catch(local),
    );
  }
  return published.get(name) as Promise<string | null>;
}

/** `<!-- version: <package> -->`: its published version, linked to its npm page; nothing if none. */
function versions(): Plugin {
  return {
    name: "versions",
    transformIndexHtml: async (html) => {
      const names = [...html.matchAll(/<!-- version: ([\w-]+) -->/g)].map((m) => m[1] as string);
      const found = new Map(
        await Promise.all(names.map(async (n) => [n, await version(n)] as const)),
      );
      return html.replace(/<!-- version: ([\w-]+) -->/g, (_m, name: string) => {
        const shown = found.get(name);
        if (!shown) return "";
        const npm = `https://www.npmjs.com/package/@list-picker/${name}`;
        return `<a class="version" href="${npm}" title="@list-picker/${name} on npm">v${shown}</a>`;
      });
    },
  };
}

/**
 * `<!-- nav <root> [<current>] -->`: the one nav (`site/partials/nav.html`), its links from
 * `root`, the link to `current` marked as the page (or, as `in:<current>`, as the page's
 * section). The playground's build uses it too.
 */
export function nav(): Plugin {
  return {
    name: "nav",
    transformIndexHtml: (html) =>
      filled("nav", html, /<!-- nav (\S+)(?: (\S+))? -->/, (_m, root: string, current?: string) => {
        const out = readFileSync(fileURLToPath(new URL("partials/nav.html", SITE)), "utf8")
          .replace(/^<!--.*?-->\n/s, "")
          .replaceAll("{root}", root);
        if (!current) return out;
        // `in:<link>`: the page is in that link's section (a demo page: the demos), not that page.
        const section = current.startsWith("in:");
        const link = `href="${root}${section ? current.slice(3) : current}"`;
        // A page names a link the nav doesn't have: fail the build, not mark nothing.
        if (!out.includes(link)) throw new Error(`nav: no link to ${current}`);
        return out.replace(link, `${link} aria-current="${section ? "true" : "page"}"`);
      }),
  };
}

/** A page's `<!-- <name> … -->` marker replaced; a marker left (misspelt) fails the build. */
function filled(
  name: string,
  html: string,
  marker: RegExp,
  replace: (match: string, ...groups: string[]) => string,
): string {
  const out = html.replace(marker, replace);
  if (new RegExp(`<!--\\s*${name}\\b`).test(out))
    throw new Error(`${name}: a marker not understood`);
  return out;
}

/** Each demo's page by framework; a framework missing here shows the demo as "soon" in it. */
const DEMOS: Record<string, Record<string, string>> = {
  Board: { Vanilla: "board.html", React: "react-demo.html" },
  Player: { Vanilla: "player.html", React: "player-react.html" },
};
const FRAMEWORKS = ["Vanilla", "React", "Angular"];

/**
 * `<!-- demos <root> <demo> <framework> -->`: the demos switcher. A demo's link keeps the framework
 * when that demo has it (else its vanilla page); a framework's link keeps the demo, or says "soon".
 */
export function demos(): Plugin {
  return {
    name: "demos",
    transformIndexHtml: (html) =>
      filled(
        "demos",
        html,
        /<!-- demos (\S+) (\w+) (\w+) -->/,
        (_m, root: string, demo: string, fw: string) => {
          const pages = DEMOS[demo];
          if (!pages?.[fw]) throw new Error(`demos: no ${demo} in ${fw}`);
          const item = (text: string, href: string | undefined, current: boolean) =>
            href
              ? `<li><a href="${root}${href}"${current ? ' aria-current="page"' : ""}>${text}</a></li>`
              : `<li><span class="soon">${text} <small>soon</small></span></li>`;
          const demoLinks = Object.entries(DEMOS).map(([name, by]) =>
            item(name, by[fw] ?? by.Vanilla, name === demo),
          );
          const fwLinks = FRAMEWORKS.map((name) => item(name, pages[name], name === fw));
          // A landmark, but not a `<nav>`: the site's nav is styled by its element.
          const groups = `<ul aria-label="Demo">${demoLinks.join("")}</ul><ul aria-label="Framework">${fwLinks.join("")}</ul>`;
          return `<div class="demos-switch" role="navigation" aria-label="Demos">${groups}</div>`;
        },
      ),
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
        const out = body
          // A table fills its width, and scrolls inside this box when it is wider than the page.
          .replace(/<table>/g, '<div class="table-scroll"><table>')
          .replace(/<\/table>/g, "</table></div>")
          .replace(/<h([1-6])>(.*?)<\/h\1>/g, (_h, level: string, inner: string) => {
            const id = inner
              .replace(/<[^>]+>|&[#\w]+;/g, "")
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-");
            if (level === "2") sections.push(`<li><a href="#${id}">${inner}</a></li>`);
            // A package's name wraps after its scope ("@list-picker/" then "vanilla"), not at a hyphen.
            const text =
              level === "1"
                ? inner.replace(/^(@[\w-]+\/)/, '<span class="scope">$1</span>')
                : inner;
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

/** The packages by name, from their source (as in `vitest.config.ts`): the demos import them. */
const source = (name: string) =>
  fileURLToPath(new URL(`../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  base: "/list-picker/",
  resolve: {
    alias: {
      "@list-picker/core": source("core"),
      "@list-picker/vanilla": source("vanilla"),
      "@list-picker/react": source("react"),
    },
  },
  plugins: [nav(), demos(), markdown(), versions()],
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
