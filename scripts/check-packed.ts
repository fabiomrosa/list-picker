// The packages as npm ships them (M4 retro, proposal 3): pack them, install the tarballs in an empty
// project (with React), type-check every `ts`/`tsx` block of their READMEs against them, run core's
// example in Node, and build vanilla's and react's with Vite and run them in Chrome. Runs after
// `npm run build` (`npm run packed`).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build, preview } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BIN = join(ROOT, "node_modules/.bin");
const dir = mkdtempSync(join(tmpdir(), "list-picker-packed-"));
function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
    const where =
      "(core.ts: core's README; main.ts and snippets.ts: vanilla's example, then its snippets in order; app.tsx: react's example)";
    throw new Error(
      `${cmd.split("/").pop()} ${args.join(" ")} failed ${where}:\n${stdout}${stderr}`,
    );
  }
}

/** The `ts` (or `tsx`) code blocks of a README, in order. */
function blocks(readme: string): string[] {
  return [...readFileSync(join(ROOT, readme), "utf8").matchAll(/```tsx?\n(.*?)```/gs)].map(
    (m) => m[1] ?? "",
  );
}
/** React and its types, at the versions the repository tests with. */
const { devDependencies } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const react = ["react", "react-dom", "@types/react", "@types/react-dom"].map(
  (name) => `${name}@${devDependencies[name]}`,
);

try {
  const tarballs = ["core", "vanilla", "react"].map((name) => {
    const cwd = join(ROOT, "packages", name);
    return `./${execFileSync("npm", ["pack", "--silent", "--pack-destination", dir], { cwd, encoding: "utf8" }).trim()}`;
  });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "packed", private: true, type: "module" }),
  );
  // React from the registry (a warm npm cache spares the network).
  run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", ...tarballs, ...react]);

  // Core's example, whole; vanilla's first is the example, the others are snippets set in it.
  const [coreExample = ""] = blocks("packages/core/README.md");
  const [example = "", ...snippets] = blocks("packages/vanilla/README.md");
  const [reactExample = ""] = blocks("packages/react/README.md");
  writeFileSync(join(dir, "app.tsx"), reactExample);
  writeFileSync(join(dir, "core.ts"), coreExample);
  writeFileSync(join(dir, "main.ts"), example);
  writeFileSync(
    join(dir, "snippets.ts"),
    [example, ...snippets.map((s) => `{\n${s}}\n`)].join("\n"),
  );
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "es2024",
        module: "esnext",
        moduleResolution: "bundler",
        lib: ["es2024", "dom"],
        jsx: "react-jsx",
        noEmit: true,
      },
      files: ["core.ts", "main.ts", "snippets.ts", "app.tsx"],
    }),
  );
  run(join(BIN, "tsc"), ["-p", "tsconfig.json"]);
  console.log(
    `types: ${1 + 1 + snippets.length + 1} README examples check against the packed packages`,
  );

  // Its last line is the move it prints, as a comment: Node prints the same object, single-quoted.
  const expected = (coreExample.trim().split("\n").at(-1) ?? "")
    .replace(/^\/\/\s*/, "")
    .replaceAll('"', "'");
  const out = run("node", ["core.ts"]).replace(/\s+/g, " ").trim();
  if (out !== expected)
    throw new Error(`core's example printed\n  ${out}\nnot, as its README says,\n  ${expected}`);
  console.log("core: its example runs in Node");

  const page = (script: string) =>
    `<!doctype html><div id="board"></div><script type="module" src="./${script}"></script>`;
  writeFileSync(join(dir, "index.html"), page("main.ts"));
  writeFileSync(join(dir, "react.html"), page("app.tsx"));
  await build({
    root: dir,
    logLevel: "error",
    configFile: false,
    build: { rollupOptions: { input: [join(dir, "index.html"), join(dir, "react.html")] } },
  });
  const server = await preview({
    root: dir,
    configFile: false,
    preview: { port: 0, strictPort: false },
  });
  const browser = await chromium.launch({ channel: "chrome" }).catch(async (error: unknown) => {
    await server.close(); // Chrome did not start: the server still closes
    throw error;
  });
  try {
    // The same board in both READMEs: "Publish" moves to Done by keyboard.
    for (const [name, path] of [
      ["vanilla", ""],
      ["react", "react.html"],
    ] as const) {
      const tab = await browser.newPage();
      const errors: string[] = [];
      tab.on("pageerror", (e) => errors.push(e.message));
      await tab.goto(`${server.resolvedUrls?.local[0] ?? ""}${path}`);
      await tab.locator('[data-lp-card="b"]').focus();
      for (const key of ["Space", "ArrowRight", "Space"]) await tab.keyboard.press(key);
      const done = await tab.locator('[data-lp-cards="done"] [data-lp-card]').allTextContents();
      if (done.join() !== "Publish" || errors.length) {
        throw new Error(
          `${name}'s example: Done holds ${JSON.stringify(done)}, errors ${JSON.stringify(errors)}`,
        );
      }
      console.log(`${name}: its example builds and moves a card by keyboard in Chrome`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
