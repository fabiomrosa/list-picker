// The packages as npm ships them (M4 retro, proposal 3): pack both, install the tarballs in an empty
// project, type-check every `ts` block of their READMEs against them, run core's example in Node,
// and build vanilla's with Vite and run it in Chrome. Runs after `npm run build` (`npm run packed`).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { build, preview } from "vite";

const ROOT = new URL("..", import.meta.url).pathname;
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
    throw new Error(`${cmd.split("/").pop()} ${args.join(" ")} failed:\n${stdout}${stderr}`);
  }
}

/** The `ts` code blocks of a README, in order. */
function blocks(readme: string): string[] {
  return [...readFileSync(join(ROOT, readme), "utf8").matchAll(/```ts\n(.*?)```/gs)].map(
    (m) => m[1] ?? "",
  );
}

try {
  const tarballs = ["core", "vanilla"].map((name) => {
    const cwd = join(ROOT, "packages", name);
    return `./${execFileSync("npm", ["pack", "--silent", "--pack-destination", dir], { cwd, encoding: "utf8" }).trim()}`;
  });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "packed", private: true, type: "module" }),
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", ...tarballs]);

  // Core's example, whole; vanilla's first is the example, the others are snippets set in it.
  const [coreExample = ""] = blocks("packages/core/README.md");
  const [example = "", ...snippets] = blocks("packages/vanilla/README.md");
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
        noEmit: true,
      },
      files: ["core.ts", "main.ts", "snippets.ts"],
    }),
  );
  run(join(BIN, "tsc"), ["-p", "tsconfig.json"]);
  console.log(
    `types: ${1 + 1 + snippets.length} README examples check against the packed packages`,
  );

  const out = run("node", ["core.ts"]);
  if (!out.includes('fromListId: "todo"') && !out.includes("fromListId: 'todo'")) {
    throw new Error(`core's example printed no move:\n${out}`);
  }
  console.log("core: its example runs in Node");

  writeFileSync(
    join(dir, "index.html"),
    '<!doctype html><div id="board"></div><script type="module" src="./main.ts"></script>',
  );
  await build({ root: dir, logLevel: "error", configFile: false });
  const server = await preview({
    root: dir,
    configFile: false,
    preview: { port: 0, strictPort: false },
  });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.resolvedUrls?.local[0] ?? "");
    await page.locator('[data-lp-card="b"]').focus();
    for (const key of ["Space", "ArrowRight", "Space"]) await page.keyboard.press(key);
    const done = await page.locator('[data-lp-cards="done"] [data-lp-card]').allTextContents();
    if (done.join() !== "Publish" || errors.length) {
      throw new Error(
        `vanilla's example: Done holds ${JSON.stringify(done)}, errors ${JSON.stringify(errors)}`,
      );
    }
    console.log("vanilla: its example builds and moves a card by keyboard in Chrome");
  } finally {
    await browser.close();
    await server.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
