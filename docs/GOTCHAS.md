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
  engine, so `mount` writes in a microtask (its Renderers run in the listener itself).
- Chrome fires `focusout` on a focused element moved or replaced in the DOM (`before`, `append`,
  `replaceWith`), and it loses
  the focus; happy-dom does neither, so only the browser test catches a missing guard or refocus.
- During an active drag `mount` writes nothing: the DOM can show cards and lists the Board has
  moved or removed until the drag ends. Code that reads the mounted DOM after a `change` (the
  demo's `refresh`) must check each id against the Board; the engine's drop skips such items.
- After a Renderer error the item stays on the Board (the operation is done; only its listener
  failed): every later change runs that Renderer again and rethrows, a drop's from `pointerup`, and
  `mount` writes nothing until the item is removed or the Renderer succeeds.
- A `MutationObserver` with a callback hands its records to the callback in a microtask, so
  `takeRecords()` after an `await` returns nothing even when the DOM changed (it misled L3.2).
- `mount` keys elements by id: a card removed and added again with the same id before `mount`
  writes (the same tick, or during a drag) keeps its old element if the value is the same object;
  another object is drawn again, like an update.
- With the pointer captured (`setPointerCapture` on press), Chrome sends the `click` to the
  capturing element: for a list pressed by its handle, the list container, not the handle.
- Chrome fires no `click` after a pointer drag (the pressed card is hidden while dragged), even
  one released where it started; the engine still swallows the next click after a drag, for
  browsers that do fire it, so only the happy-dom test sees that path.
- `elementFromPoint` returns the Clone itself unless the Clone has `pointer-events: none`.
