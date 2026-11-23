# list-picker gotchas

Non-obvious facts about this exact stack and machine. Read the section for what you are touching
before you start; it saves hours. Add new ones as you learn them (SESSION §3.7). Facts, not rules.

## Toolchain
Node 26 and npm 11 locally (pnpm is installed too, but the workspace uses npm).
- Biome 2.6 formats Markdown too: `biome check --write .` rewrapped every doc until `**/*.md` was
  excluded in `biome.json`.
- TypeScript 7 is the native (Go) compiler; the binary is still `tsc`. Source imports use the `.ts`
  extension (`rewriteRelativeImportExtensions` turns them into `.js` in `dist/`).
- A scripted edit that replaces everything between a start and an end marker silently deletes
  whatever sits between them (L2.3 lost two functions that way); exact, unique snippets do not.

## DOM and drag
- Browser tests are `e2e/*.e2e.ts`: Vitest's default include also matches `*.spec.ts`, so a
  Playwright `*.spec.ts` would be run by Vitest too.
- Headless Chrome hides scrollbars by default (`--hide-scrollbars`), so a list with a scrollbar is
  as wide inside as one without; `playwright.config.ts` turns that off so layout bugs that depend on
  scrollbars show up (the Placeholder width bug did not, until then).
- In the playground, a broken engine DOM swap is invisible end-to-end: the playground redraws from
  the Snapshot after every change. Browser tests catch a broken drop, not a broken swap; the swap is
  covered by the `happy-dom` tests.
- Reading layout (`getBoundingClientRect`, `offsetTop`, `offsetHeight`) right after a DOM write
  forces a synchronous layout. In a `pointermove` loop that is the main cost of a board, far more
  than any list operation.
- Writing `scrollTop` or `scrollLeft` needs an up-to-date layout, so the engine's scroll write after
  the Placeholder's move forces one layout per auto-scroll frame. Scrolling first avoids it but
  breaks upward auto-scroll: the Placeholder then moves above the scroll anchor after the write, and
  scroll anchoring (`overflow-anchor: auto`) pushes the list back by a card every few frames. The
  write after `place()` overrides that adjustment (L3.4).
- Without `touch-action: none` on the draggable element, a touch drag scrolls the page and fires
  `pointercancel`.
- `setPointerCapture` keeps `pointermove` coming when the pointer leaves the card; without it, a
  fast move loses the drag.
- On a drop the engine calls `board.moveCard` (which emits `change` synchronously) before it moves
  the card into the Placeholder's place; a `change` listener that writes the DOM at once races the
  engine, so `mount` reconciles in a microtask.
- `mount` keys elements by id: a card removed and added again with the same id before the
  reconcile runs keeps its old element (its Renderer is not called again).
- `elementFromPoint` returns the Clone itself unless the Clone has `pointer-events: none`.
