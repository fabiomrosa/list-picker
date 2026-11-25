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
- An outline outside a card (`outline-offset` > 0), or a shadow, is clipped by a list container
  that scrolls (`overflow-y: auto` clips sideways too): draw focus outlines inside the card, and
  give shadows room with the container's padding.
- GitHub Pages: `deploy-pages` in the same job as `upload-pages-artifact` failed again and again
  with "No artifacts named github-pages": the artifact listing lags the upload (~0.3 s later it
  was still empty). A separate `deploy` job (`needs: build`) starts seconds later.
- CSS applies `translate`, `rotate`, `scale`, then `transform`: a `rotate` on an element moved by
  `transform: translate(…)` turns the offset too. The engine writes the `translate` property.
- Styling a skin around the engine: a list's Clone has no `data-lp-list` (match it with
  `[data-lp-clone]:has(> [data-lp-cards])`); during a drag the Placeholder and the hidden item are
  siblings of the items, so `:nth-child(…)` shifts (use `:nth-child(… of [data-lp-list])`); and a
  keyboard pick up of a list puts `data-lp-grabbed` on the whole list, not on its handle.
- With the pointer captured (`setPointerCapture` on press), Chrome sends the `click` to the
  capturing element: for a list pressed by its handle, the list container, not the handle.
- Chrome fires no `click` after a pointer drag (the pressed card is hidden while dragged), even
  one released where it started; the engine still swallows the next click after a drag, for
  browsers that do fire it, so only the happy-dom test sees that path.
- `elementFromPoint` returns the Clone itself unless the Clone has `pointer-events: none`.

## Site and browser tests
- Playwright in WebKit fires a `mouse.move` with `steps` and the following `mouse.up` within one
  animation frame (Chrome paces each step to a frame): code that writes on `requestAnimationFrame`
  sees the release before its frame. The engine runs a pending frame at the release.
- Safari does not focus a radio (or a button) when it, or its label, is clicked: a test that presses
  an arrow key after a click presses it on the control (`locator.press`), not on `page.keyboard`.
- WebKit on macOS shows overlay scrollbars, which take no room, whatever Playwright's launch flags:
  a test about a scrollbar's width has nothing to measure there.
- Playwright's `toHaveText` reads `textContent`, hidden (`display: none`) text included; what a
  copy takes, and what a person sees, is `innerText`.
- Chrome reads a `<wbr>` as a space in the accessible name ("@list-picker/ vanilla"), and
  Playwright's `ariaSnapshot` computes its own name and hides it; check Chrome's tree over CDP
  (`Accessibility.getFullAXTree`). A zero-width space in CSS with empty alt text
  (`content: "\200b" / ""`) gives a line-break opportunity without changing the accessible name.
- A browser that does not know `:has()` drops the whole rule that names it, selector list and all:
  keep the fallback in its own rule. The minifier may split such a rule in the build and hide the
  bug there; the e2e tests run on the dev servers.
- Vite's dev server injects CSS imported from a script (the demo's) after the first paint, so CSS
  transitions run at load: a trace or a test that starts at once measures them too.

## Publishing
- A `!` command in the Claude Code prompt keeps its working directory for the next one: a second
  `cd packages/<name>` fails after the first; give the full path.
- npm's browser 2FA cannot complete from a `!` command (it does not wait): `npm publish
  --otp=<code>` with the authenticator's current code, a new code for each package.
- A newly published package answers 404 on the registry for about two minutes.
- A version number is published once: npm never reuses it, even after an unpublish.
