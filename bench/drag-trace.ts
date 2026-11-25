// `npm run trace`: drags cards and a list in the playground in Chrome with a performance trace on,
// then counts the layouts and style recalculations JavaScript forced, by where they ran: inside a
// `pointermove` dispatch (the claim is zero) or inside an animation-frame callback. Method and
// results: docs/decisions/0002-drag-layout-trace.md.
import { type Browser, chromium, type Page } from "@playwright/test";
import { createServer } from "vite";

const PORT = 5182;
const STEPS = 60;

type TraceEvent = {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: { name?: string; data?: { type?: string } };
};

/** Presses `from`'s top-left area, moves to `to` in `STEPS` steps, rests `restMs`, releases. */
async function drag(page: Page, from: string, to: string, at = 0.5, restMs = 0): Promise<void> {
  const a = await page.locator(from).boundingBox();
  const b = await page.locator(to).boundingBox();
  if (!a || !b) throw new Error(`not visible: ${from} or ${to}`);
  await page.mouse.move(a.x + 10, a.y + 5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * at, { steps: STEPS });
  if (restMs) {
    // Small moves while resting, as a hand does: auto-scroll keeps running between them.
    for (let i = 0; i < restMs / 50; i++) {
      await page.mouse.move(b.x + b.width / 2 + (i % 2), b.y + b.height * at);
      await page.waitForTimeout(50);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(100);
}

async function record(browser: Browser): Promise<TraceEvent[]> {
  // Narrower than the board's lists, so it scrolls sideways (L4.21 let the board fill the page).
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("[data-lp-card]");
  // Vite's dev server injects the CSS after the first paint: let its colour transitions finish.
  await page.waitForTimeout(500);
  await browser.startTracing(page, { categories: ["devtools.timeline"] });
  await drag(page, '[data-lp-card="Design the model"]', '[data-lp-card="Write the tests"]', 0.9);
  await drag(page, '[data-lp-card="Write the tests"]', '[data-lp-card="Linked list"]', 0.1);
  await drag(page, '[data-lp-card="Linked list"]', '[data-lp-cards="Done"]');
  await page.locator("#board").evaluate((board) => {
    board.scrollLeft = board.scrollWidth;
  });
  // Rest near the bottom edge of Backlog: auto-scroll runs while the pointer barely moves.
  await drag(page, '[data-lp-card="Linked list"]', '[data-lp-cards="Backlog"]', 0.97, 1500);
  await page.locator("#board").evaluate((board) => {
    board.scrollLeft = 0;
  });
  await drag(page, '[data-lp-list="To do"] [data-lp-list-handle]', '[data-lp-list="Doing"]', 0.2);
  const buffer = await browser.stopTracing();
  await page.close();
  return (JSON.parse(buffer.toString()) as { traceEvents: TraceEvent[] }).traceEvents;
}

/** How many `name` events on the main thread fall inside one of `parents`. */
function inside(events: TraceEvent[], parents: TraceEvent[], name: string): number {
  return events.filter(
    (e) =>
      e.name === name &&
      parents.some((p) => e.ts >= p.ts && e.ts < p.ts + (p.dur ?? 0) && e.tid === p.tid),
  ).length;
}

const server = await createServer({
  root: "playground",
  server: { port: PORT, strictPort: true },
  logLevel: "silent",
});
await server.listen();
// Real scrollbars, as users see them (headless Chrome hides them by default).
const browser = await chromium.launch({
  channel: "chrome",
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
try {
  const all = await record(browser);
  const main = all.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
  const events = all.filter((e) => e.ph === "X" && e.pid === main?.pid && e.tid === main?.tid);
  const moves = events.filter(
    (e) => e.name === "EventDispatch" && e.args?.data?.type === "pointermove",
  );
  const frames = events.filter((e) => e.name === "FireAnimationFrame");
  // A wrong thread, or events Chrome emits in another shape, would otherwise print "0 forced".
  if (moves.length === 0 || frames.length === 0) {
    throw new Error("no pointermove dispatch or animation frame found on the main thread");
  }
  const row = (where: string, parents: TraceEvent[]) =>
    `| ${where} | ${parents.length} | ${inside(events, parents, "Layout")} | ${inside(events, parents, "UpdateLayoutTree")} |`;
  console.log("| Inside | Count | Forced layouts | Forced style recalcs |");
  console.log("|---|---|---|---|");
  console.log(row("`pointermove` dispatch", moves));
  console.log(row("animation-frame callback", frames));
  const layouts = events.filter((e) => e.name === "Layout").length;
  console.log(`\nAll layouts on the main thread: ${layouts}.`);
} finally {
  await browser.close();
  await server.close();
}
