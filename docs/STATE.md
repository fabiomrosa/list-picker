# list-picker state

What exists in this repository now. The code wins over this file: if they disagree, fix this file.
Every slice's pull request updates it (SESSION §3).

## Capabilities
- `LinkedList`: `insertBefore(value, beforeId | null)` (unknown `beforeId` throws), `remove(id)`,
  `replace(value)` (the node with that id; unknown throws),
  `get`, `has`, `size`, `first`, `last`, ordered iteration; duplicate ids throw. A property test
  checks every PRODUCT invariant of the list against an array model over 1000 random operation
  sequences.
- `Board<L, C>`: `addList(list, beforeListId | null)`, `addCard(listId, card, beforeCardId | null)`,
  `moveCard(id, toListId, beforeCardId | null)` (returns whether the order changed; validates
  everything before unlinking), `moveList(id, beforeListId | null)` (same rules), `removeCard`,
  `removeList` (with its cards), `updateList(list)` and `updateCard(card)` (replace the value with
  that id in place, return the old one; `change` only), `swapCards(a, b)` (two cards exchange
  places in O(1): a `move` per moved card, replayable with `moveCard(id, toListId, nextId)`, then
  one `change`), `getList`, `getCard`, `listOf(cardId)`, `neighbours(cardId)` (`{ prev, next }` in
  its List, O(1)), `lists()`, `cards(listId)`. Card ids are unique across the Board, list ids
  across the Lists; bad input throws and changes nothing. A property test runs random sequences of
  every Board operation from a populated Board against a nested-array model.
- Board events: `on("move" | "change", listener)` returns an unsubscribe function. `move` carries
  `{ kind, id, fromListId, toListId, prevId, nextId }` (DEC-11); `change` follows every change.
  Nothing is emitted for a no-op or a throw; a throwing listener does not undo the change, and the
  other listeners still run (the first error is rethrown).
- `Board.snapshot()`: a frozen `{ lists: [{ list, cards }] }` in Board order holding the user's own
  values; the same object until the Board changes (already fresh inside listeners).
- `@list-picker/vanilla`: `createDrag(root, board)` returns `{ destroy }`. A press on a
  `[data-lp-card]` (not on a control inside it) captures the pointer; past 4 px it shows a Clone
  (inside `root`, ids removed) over the card and a Placeholder of its size in its place, and hides
  the card (inline `display: none`, `data-lp-dragging`). A release drops: `board.moveCard` to the
  Placeholder's list, before its next card or at the end, and the card takes the Placeholder's
  place; if the Board rejects it, the card goes back and the error is rethrown. Esc (a `keydown`
  listener on `document` only during a drag), `pointercancel` or `destroy()` cancel: the card is
  shown where it was and nothing moves.
  Auto-scroll: within 40 px of the visible edge of a scrollable container around the pointer (a list
  vertically, the board horizontally; a container cut off by the window uses the window's edge), it
  scrolls each frame, faster closer to the edge, and keeps going while the pointer rests, until
  there is nothing left to scroll that way.
  Lists drag the same way, pressed by a `[data-lp-list-handle]` inside a `[data-lp-list]`:
  horizontally among the sibling lists, dropped with `board.moveList`; a press on a card inside a
  list still drags the card. The Clone follows the pointer: moves only
  store it, one `requestAnimationFrame` per frame writes `translate` (applied before a skin's
  `rotate` or `scale`, so a tilted Clone stays under the pointer). Each frame the Placeholder
  goes, in the list container under the pointer (off every container: the list hovered, else the
  nearest list above the pointer in its column, and below a list to its end), before the first
  visible card whose vertical
  middle is below the pointer, or to the end; gaps between cards follow the same rule, and the DOM
  is written only when its place changes.
  Keyboard (DEC-15, a `keydown` listener on `root`): Space on a focused card picks it up
  (`data-lp-grabbed`); ↑ ↓ ← → move it (to the same position or the end of the neighbouring list),
  each a `board.moveCard`, the element following with the focus; Space drops, Esc puts it
  back, the focus leaving drops. A list moves the same way by its focused handle, with ← → only
  (`board.moveList`). It never runs with a pointer drag.
  Activation (DEC-17): `options.onActivate({ kind, id })` (type `Activation`) runs on a click on a
  card or a list's handle (not on a control inside it) that started no drag, and on Enter on a
  focused one when nothing is picked up and no press is pending. A capture-phase `click` listener
  on `root` swallows a click after a drag, until the next press (a capture-phase `pointerdown`
  clears it); Chrome and WebKit fire no such click.
  Rules (DEC-17): `options.canMove({ kind, id, toListId, beforeId })` (type `ProposedMove`;
  `toListId` `null` for a list) is asked each frame before the Placeholder goes to a place, again
  at the drop with the ids it applies (refused: the drop cancels), and before each keyboard step;
  where the item was picked up is always allowed while shown. The keyboard skips to the next allowed place in
  that direction (within a container, or the next list across), or does nothing.
  `createDrag`'s `options.moveElements: false` (DEC-18, vanilla 1.1.0) is for a renderer that draws
  from the Snapshot: a pointer drop only changes the Board and shows the element again where it was;
  a Board change that removes the dragged item or the Placeholder's list cancels the drag. With it,
  a keyboard step and Esc change only the Board too; the pick-up is kept by id: a `MutationObserver`
  on `root` (while a card or a list is picked up) finds its element again after each redraw and puts
  `data-lp-grabbed` and the focus back on it, and a `focusout` is decided after a `setTimeout(0)`
  (a redraw's blur is not the focus leaving). `playground/redraw.html` (browser tests only, not
  built) redraws from the Snapshot in the change listener or in a microtask.
  Announcements (DEC-16, `src/announce.ts`): a visually hidden `[data-lp-live]`
  `aria-live="assertive"` region in the document's body, not in `root` (removed by `destroy()`) says pick up, drop and cancel
  of a pointer drag, and also each keyboard step: "Picked up Design the model. To do, position 1
  of 2." The label is the item's `aria-label`, else its text (which runs block contents together:
  "Designthe model"), else its id (a list's from its handle); the position comes from the Board. `createDrag(root, board, { messages })` and
  `mount(..., { messages })` replace any of `pickUp`, `move`, `drop`, `cancel` (types `Messages`,
  `Announcement` `{ kind, label, listLabel, position, count }`; `DragOptions`, in `src/drag.ts`,
  holds `messages` and `onActivate`).
- `mount(root, board, { renderList, renderCard })` (`@list-picker/vanilla`) returns `{ destroy }`:
  it appends to `root`, per list in Board order, a `div[data-lp-list]` holding the list Renderer's
  element (marked `data-lp-list-handle`, focusable like each card) and a `div[data-lp-cards]` of the card Renderer's elements
  (each marked `data-lp-card`, and `tabindex="0"` unless it has one), then starts `createDrag`. Every Renderer runs and is checked first: a
  missing `root`, or a Renderer result that is not a new, detached `HTMLElement` (not in the
  document, not returned twice), throws and changes nothing; `destroy()` stops the drag and removes what it
  added. It follows the Board by id: on each `change` it renders the new lists and cards at once,
  and again any whose value is another object than the one it drew (`updateList`, `updateCard`)
  (a Renderer error throws from the Board operation and writes nothing); then, in a microtask (so a
  drop's own DOM write comes first; several changes write once) and only when no drag is active (else
  when it ends), it swaps each redrawn element in (focus and keyboard pick up follow), removes
  the gone ones, and moves into Board order only the elements outside the longest run already in
  order, leaving the user's other
  children of `root`, the Clone and the Placeholder where they are. After a drop it writes nothing.
  A change that removes the dragged card or list, or the list under its Placeholder, abandons the
  drag; the Placeholder does not enter a list the Board no longer holds, a drop skips the items
  the DOM still shows but the Board no longer holds there, and a card removed between the press
  and the drag's start is not dragged.
- Browser tests (`npm run e2e`, part of the gate): Playwright drags cards in the playground in
  Chrome: within a list, across lists, into an empty list, to the end of a tall list by
  auto-scroll (downward, and upward without ever being pushed back), a list by its title; a click
  changes nothing; a click or Enter opens a card's dialog, and a drag (back in place or away) opens
  none; a renamed list and a picked-up card updated from code. And the site's home
  (`e2e/home.e2e.ts`, the site served on 5181): its board by pointer and keyboard, in the skin's
  look, Doing refusing a fourth card, and the three skins.
- `npm run trace` drags cards and a list on the demo in Chrome with a performance trace and counts
  forced layouts by where they ran; the result is in `docs/decisions/0002-drag-layout-trace.md`
  (none in `pointermove`; one per auto-scroll frame, and at most one in a drag's first frame).
- `npm run bench` compares the Board with an array board on seeded random moves; the result is in
  `docs/decisions/0001-linked-lists-vs-arrays.md` (about equal at 10 cards per list, ~3× faster at
  100, ~8× at 500).
- The demo board (`playground/`, `npm run dev`) is drawn by `mount` with its own Renderers: each
  card shows its neighbours and ↑ ↓ ← → × buttons, each list header (the drag handle) its card count
  and ← → ×; positions are read at click time and the neighbours, counts and button states refresh
  after every change. Forms add lists and cards at the end or before a chosen one and move cards
  (showing "same place" when nothing changed); the page logs every `move` event and the `change`
  count. A click or Enter on a list's header edits its name in place (Enter
  or leaving saves, Esc cancels; `updateList`), and on a card opens a dialog that renames it
  (`updateCard`), both through `onActivate`; no browser prompt; Doing takes at most 3 cards
  (`canMove`); `window.board` is the Board. A tall Backlog list (14 cards, lists scroll past 22rem) and a
  board that scrolls sideways when the window is narrower than its lists (under ~1040px; the
  auto-scroll tests and the trace use 900px) show auto-scroll both ways. Its look is the site's
  (`site/style.css`, then `playground/demo.css`); the package ships no styles. Its nav links are
  relative to the site (`../`), so under `npm run dev` they stay on the demo.

An npm workspace with one package, `@list-picker/core`, that builds, and the gate
(`npm run verify`: Biome, `tsc`, Vitest with an 80% line floor, build) locally and in CI, plus the
title, review-section, size, frozen-files and secret checks.
- React (L5.3, L5.4; unpublished): `useBoard(board)` gives the Snapshot as React state;
  `useListPicker(board, options)` attaches the engine with `moveElements: false` to a board React
  draws, by a `ref` and the `data-lp-*` getters; cards and lists move by pointer and keyboard.

## Modules
- `packages/core`: `LinkedList`, `Node` (`src/linked-list.ts`); `Board`, `MoveEvent`, `BoardEvents`,
  `Snapshot` (`src/board.ts`); `Emitter` (`src/emitter.ts`, internal).
- `playground/`: the demo board, a Vite page over the packages' source; not published, outside
  coverage.
- `packages/vanilla`: `createDrag` (`src/drag.ts`, with `src/keyboard.ts` and `src/landed.ts`,
  internal), `mount` (`src/mount.ts`); imports only types
  from `core`.
- `packages/react` (L5.3): `useBoard` (`src/use-board.ts`: `useSyncExternalStore` over the Board's
  `change`, its Snapshot as the value, the server's too); `useListPicker` (L5.4,
  `src/use-list-picker.ts`: a callback `ref` for the root and getters `list`, `listHandle`, `cards`,
  `card` for the `data-lp-*` attributes and focusability; the engine starts with `moveElements:
  false` when the root mounts, in `useEffect`, and is destroyed when it unmounts or changes; its
  options are the latest render's (kept in a ref after each commit, read by the engine through
  wrappers and a `messages` object of getters), and only giving or removing `onActivate` or
  `canMove` restarts it, ending a drag in progress (L5.5); `StrictMode` leaves one engine; checked
  once on React 18.3.1); `react` `^18.3.0 || ^19.0.0` as a peer,
  core and vanilla as dependencies; tests with React Testing Library in happy-dom (`cleanup()` by
  hand: Vitest runs without globals). Root `workspaces` list the packages in build order (core,
  vanilla, react); `tsconfig.json`'s `paths` and `vitest.config.ts`'s aliases resolve the three
  names to their source; `"jsx": "react-jsx"`.
- `bench/`: the array board, seeded move fixtures, their equivalence test, the runner, and the drag
  trace (`drag-trace.ts`).

## Packaging
- Each package has a README (install, a complete example, the API; vanilla's also the `data-lp-*`
  hooks, the keys and the announcements), the MIT `LICENSE`, and `description`, `license`,
  `repository`, `keywords`, `sideEffects: false`; `npm pack --dry-run` lists only `dist`, the
  README, the license and `package.json`. Core `1.0.0`, vanilla `1.0.1` on npm (published 2026-11-25,
  tag `v1.0.1`) and `1.1.0` in the repository (unpublished until L5.8), public (`publishConfig.access`),
  vanilla depending on core `^1.0.0`; `prepublishOnly` builds. **Published on npm** (2026-11-24,
  L4.26): `@list-picker/core@1.0.0` and `@list-picker/vanilla@1.0.0`, by the owner from their
  account (the `list-picker` org, 2FA: `npm publish --otp=<code>`), core first, from `main`; the
  tag `v1.0.0` marks the published commit (publishing traps: GOTCHAS).

## Site
- `site/` (`npm run site`, `npm run site:build` into `dist-site/`): home (intro, a table of the
  four packages, React linked to its page and Angular "coming soon"; an Install chooser of radios
  with no script, where React and Angular show no command until published; the lab's answer from
  the root README; links), `core.html`, `vanilla.html` and `react.html` rendered from the packages'
  READMEs at build time, and the
  playground (`playground/`, in the site's look: its stylesheet and nav, `playground/demo.css`; its
  board in the same three skins as the home, with the same chooser) in `demo/`; the vanilla Board
  demo (`board.html`, L5.12); and the player
  (`player.html`, a playlist on `neighbours` and `swapCards`, with a pretend play that goes on to
  the next track by `neighbours`). The skins
  (`site/home.css`) style any board by `[data-skin]` and the `hb-*` classes its Renderers set.
  Every `site/*.html` is a page, so a package's page is one more `<name>.html`, and a README link
  to `packages/<name>` goes to it.
  A package's page has an index of its README's `##` sections beside it (`main.doc`, sticky,
  hidden below 52rem). The look: monospace headings and navigation, a warm palette in light and
  dark (the accent passes WCAG AA on both backgrounds), code blocks as a terminal; system fonts only.
  The home opens with a hero and a live board (`site/home.ts`, drawn by `mount`; To do, Doing
  capped at 3 with `canMove`, Done) and a skin chooser (Cards, Terminal, Pop) that changes only
  the board's `data-skin` (`site/home.css`): the same elements, restyled, Clone and Placeholder
  included. `.github/workflows/pages.yml`
  deploys it to GitHub Pages on every push to `main`: <https://fabiomrosa.github.io/list-picker/>.
- The React Player (L5.11, `site/player-react.html` and `.tsx`): the player written with
  `@list-picker/react` in the same markup; the same e2e suite runs on both.
- The demos switcher (L5.10): above each demo page (`board.html` since L5.12, `react-demo.html`,
  `player.html`, `player-react.html`), the
  demo (Board, Player) and the framework (Vanilla, React, Angular "soon"), built by the site build's
  `demos()` from its `DEMOS` table; a page's `<!-- nav … -->` or `<!-- demos … -->` marker that is
  not understood fails the build.
- The React demo (L5.6, `site/react-demo.html` and `.tsx`): the home's kanban board written with
  `@list-picker/react` under `StrictMode`, in the markup `mount` draws, so `home.css`'s skins style
  it; Doing capped at 3 (`canMove`), a click or Enter opens a card (`onActivate`). The site build
  resolves the packages' names to their source (`site/vite.config.ts`). Since L5.9 the nav (one partial,
  `site/partials/nav.html`) has one `demos` link, to the vanilla Board (`board.html` since L5.12). `e2e/react.e2e.ts` drives it.
- `site/react.html` (L5.7) renders `packages/react/README.md`; the nav's Docs list core, vanilla and
  react; two nav rows below 49rem (the brand and buttons, then the pages, down to 320px). A README link to another package's section
  (`packages/vanilla#keyboard`) goes to its page here (`vanilla.html#keyboard`). A package npm does not
  have (404) shows no version; one npm cannot be reached shows its `package.json`'s.

## Contract
None yet.

## Known issues
None.

## Last session
- **2026-11-25, L5.12:** the vanilla Board page (`site/board.html` and `board.ts`): the home's board
  by `mount` in the React demo's markup, with Enter opening; the switcher's vanilla Board and the
  nav's `demos` go there; `e2e/react.e2e.ts` runs the Board suite on both. The playground (`demo/`)
  is the developer's page (forms, events; the drag tests and the trace), titled "Playground",
  outside the switcher, linked from the home. PLAN: saving is now L5.13 (vanilla) and L5.14 (React),
  the code L5.15. Next: L5.13.
- **2026-11-25, L5.11:** the React Player (`site/player-react.html` and `.tsx`): the vanilla
  Player written with `@list-picker/react` in the same markup (`player.css` styles both), under
  `StrictMode`; the playing track, the clock and the tick are React state, the order the Board's.
  `e2e/player.e2e.ts` runs its whole suite on both pages; the switcher links it. Next: L5.12
  (saving the order, the vanilla Board).
- **2026-11-25, L5.10:** the demos switcher: `<!-- demos <root> <demo> <framework> -->` (the site
  build's `demos()`, its table `DEMOS` in `site/vite.config.ts`) above each demo: the demo (Board,
  Player; it keeps the framework when the demo has it) and the framework (Vanilla, React, Angular
  "soon"; a missing one says "soon"). Pages keep their addresses:
  `demo/` (the vanilla Board, the playground), `react-demo.html`, `player.html`. On a
  demo page the nav's `demos` is marked `aria-current="true"` (`<!-- nav ./ in:demo/ -->`). Next:
  L5.11 (the React Player).
- **2026-11-25, L5.9:** one nav: `site/partials/nav.html`, put in place of `<!-- nav <root>
  [<current>] -->` by the site build's `nav()` (the playground's `vite.config.ts` uses it too); the
  current page's link gets `aria-current="page"`; the demos are one link, `demos` (the vanilla
  Board), after a line; on a phone the pages fit one row under the brand down to 320px. Next: L5.10
  (the demos switcher).
- **2026-11-25, docs(M5):** planned L5.9–L5.14 (owner): one nav with one Demos link, a demos
  switcher (Board and Player, in vanilla and React), the React Player, saving the order to a
  simulated backend (vanilla, then React), and each demo's code on its page.
- **2026-11-25, fix (owner):** where lines break: `text-wrap: balance` on headings and the lede,
  `pretty` on paragraphs and list items (`style.css`); the widths stay (measured: the lede is 65ch,
  the home's text 92ch, so one `ch` value for both would have changed one of them).
- **2026-11-25, feat (owner):** a copy button in the home's install command (`site/copy.ts`): it copies
  the command shown, as the framework and package manager chosen make it (the `$` is CSS), shows a
  check for a moment and says "Copied" in a status region; the command wraps between words on a
  phone, leaving the button room.
- **2026-11-25, fix (owner):** content wider: the home's text below the board runs to 58rem (about
  100 characters a line; headings, tables, install and code take the container's 64rem; the
  lede keeps 47rem); a package page's text takes all the room beside its
  index (`12rem minmax(0, 1fr)`); a table fills its width (rows too); a README's table sits in a `.table-scroll` box
  (added by the site build) that scrolls when the table is wider than the page.
- **2026-11-25, L5.7:** the React README (install, a complete `tsx` example, the hooks, links to
  vanilla's hooks, keys and announcements) and its page; `npm run packed` packs react, installs
  React from the registry (the network, or a warm npm cache) and runs its example in Chrome like
  vanilla's. Next: L5.8 (the owner publishes vanilla 1.1.0
  and react 1.0.0).
- **2026-11-25, fix (owner):** the site's lede is 47rem, in `style.css` for every page (the player's
  had no lede style: `home.css` held it; its main stays 46rem); below the home's board, everything takes the container's 64rem like the
  board (the code block was cut off).
- **2026-11-25, L5.6:** the React demo on the site (a drag across lists, a keyboard move, Doing's cap,
  Enter opens, one engine under StrictMode; Chrome); every page's nav links it. Next: L5.7 (the
  React README and its page).
- **2026-11-25, L5.5:** `useListPicker`'s options follow renders without restarting the engine (a
  changed `canMove`, `onActivate` or `messages` applies at once); without `onActivate`, Enter stays
  the card's own; `StrictMode` runs one engine; React 18.3.1 passes too. Next: L5.6 (the React
  demo).
- **2026-11-25, L5.4:** `useListPicker`: a React board moves cards across lists by pointer and keyboard,
  React drawing each move (with the engine in its default mode, both cross-list tests fail on
  React's `removeChild` "not a child of this node", DEC-18's reason); unmounting removes the
  engine's listeners and its announcement region. Next: L5.5 (current options, StrictMode).
- **2026-11-25, L5.3:** `packages/react` at 1.0.0 (unpublished) with `useBoard`; the workspace builds
  in dependency order and passes `npm ci && npm run verify` in a clean clone. Next: L5.4
  (`useListPicker`: drag and keyboard in React).
- **2026-11-25, fix (L5.2, found in Firefox):** with `moveElements: false`, Esc put the Board back but
  left the focus on body (the pick-up was dropped before the redraw); the focus now goes back on the
  item once drawn, unless the user moved it. The real Firefox 161 (by `geckodriver`) passes the
  keyboard across redraws (both modes), the click away, Esc, and the published demo's drag and
  keyboard move.
- **2026-11-25, L5.2:** with `moveElements: false`, the keyboard changes only the Board and its
  pick-up survives the renderer's redraw (Chrome, WebKit, and happy-dom without a `focusout` on
  removal, like Firefox). Next: L5.3 (the React package and `useBoard`).
- **2026-11-25, L5.1:** `createDrag`'s `moveElements: false`: a pointer drop changes only the Board
  and moves no element; a Board change that removes the dragged item or the Placeholder's list
  cancels the drag; vanilla 1.1.0 in the repository. Next: L5.2 (the keyboard across a redraw).
- **2026-11-25, fix (owner):** the kanban demo's title is "Board": the "snapshot v<n>" counter beside it
  (a change count, read as a library version next to the site's real versions) is gone, as in the
  player.
- **2026-11-25, fix (owner):** the home's eyebrow lists facts ("Open source · TypeScript · MIT · 0
  third-party dependencies"; vanilla depends only on core, react will add a peer), and the lede opens
  with "a headless library of sortable lists for TypeScript"; on a phone the package table stacks
  each package's name, version and description.
- **2026-11-25, feat (owner):** the site shows each package's version, linked to npm: under its name in
  the home's table and under its page's title. The build reads npm's published version
  (`registry.npmjs.org/@list-picker/<name>/latest`, 3 s), so the repository being ahead of npm never
  shows (a semver only, or nothing is used); without npm, the package's `package.json`.
- **2026-11-25, fix (owner):** the nav's theme and GitHub buttons sit 0.5rem apart, a pair (they
  were the nav's gap apart, 1.25rem, almost as far as from the links).
- **2026-11-25, feat (owner):** a favicon on every page and both demos: the brand's list mark, white
  on the accent (`site/public/`: an SVG, a 32px PNG, a 180px touch icon); a browser test checks each
  site page's three icons load.
- **2026-11-25, plan M5:** the React adapter split into L5.1–L5.8 in PLAN; DEC-18 proposed (hooks
  over core and the engine; react depends on vanilla; `moveElements: false` leaves the DOM to the
  renderer), left to the agent by the owner; the owner approved the plan, DEC-18 accepted. Next: L5.1.
- **2026-11-25, real Safari (27.0.1), by WebDriver on the published site:** the kanban demo's
  mouse drag to another list and keyboard move, the player's drag and play, and fast flicks (the
  #102 case, 5 of 5) all pass, with no page error. A trap on the way: Safari's WebDriver mouse
  needs its window in front (GOTCHAS).
- **2026-11-25, vanilla 1.0.1 on npm:** published by the owner (the inert Clone, #100; the release
  that runs the pending frame, #102); tag `v1.0.1` on `4101a10`. Checked against the registry:
  `npm install @list-picker/vanilla` brings 1.0.1 with core 1.0.0, both fixes are in its `dist`, and
  the README example runs in Chrome. Next: plan M5 (the owner's decisions first).
- **2026-11-24, M4 retro, proposal 1 (WebKit):** the six WebKit e2e failures (#55) had one cause: a
  release before the last move's frame ran dropped on the Placeholder's stale place (WebKit under
  Playwright fires the moves and the release in one frame; a quick flick can too). The release now
  runs a pending frame first; part of `@list-picker/vanilla` 1.0.1 (unpublished). `E2E_BROWSER=webkit
  npm run e2e` runs the suite in WebKit by hand (once: `npx playwright install webkit`) (35 pass, 1 skipped: overlay scrollbars); CI stays on
  Chrome.
- **2026-11-24, M4 retro, proposal 9:** `e2e/home.e2e.ts` sweeps every page (home, core, vanilla,
  player, the kanban demo) from 320 to 1400px in 2px steps: no sideways scroll, the nav's buttons on
  the brand's row, its two groups on one row. With a classic scrollbar (the tests show them) it found
  three gaps the hidden-scrollbar checks missed (320, 362–368, 658–664px): the nav now takes two rows
  below 42rem, hides "demos:" below 23.25rem, and draws its links closer below 20.5rem.
- **2026-11-24, fix (M4 retro review):** the Clone is `inert` and `aria-hidden`: during a drag its
  copied controls (the demo's arrows and ×) were focusable and announced, a duplicate of the hidden
  card. `@list-picker/vanilla` 1.0.1, not yet published (the owner publishes:
  `npm publish --otp=<code>` in `packages/vanilla`).
- **2026-11-24, M4 retro, proposal 8:** `.claude/hooks/guard-git.py` runs `npm run lint` and
  `npm run typecheck` before a `git commit` and blocks it on a failure (about 1 s; the full `verify`
  stays in CI); #87 had committed a type error whose failing `verify` went unseen.
- **2026-11-24, M4 retro, proposal 4:** browser tests remove a card through the demo's × during a
  drag (the page and the Board stay in step, no page error; red without the demo's L4.1 guard).
- **2026-11-24, M4 retro, proposal 3:** `npm run packed` (in `verify`, after the build;
  `scripts/check-packed.ts`): packs both packages, installs the tarballs in an empty project,
  type-checks every README `ts` block against them, runs core's example in Node, and builds
  vanilla's with Vite and moves a card by keyboard in Chrome.
- **2026-11-24, M4 retro, proposal 2:** CI's `review` job (`scripts/check-pr-review.py`) fails a pull
  request whose "## Review" section is missing, empty or a placeholder (#83 merged that way);
  milestone plans and closes (`docs(M<n>): ...`) are exempt.
- **2026-11-24, M4 retro (the owner accepted every proposal):** 5, 6, 7, 10–13 of the M4 close here:
  CONVENTIONS (user callbacks after setup; readers of a lagging DOM; focus in Chrome; the demo
  through its UI), SESSION §0 (interaction slices' budget) and §4 (check the deploy), GOTCHAS (site,
  browser tests, publishing), the review skill (a reviewer removes only its own files). The checks
  (2, 3, 4, 8, 9) come in their own pull requests, then the WebKit diagnosis (1); 14 is left as is.
- **2026-11-24, close M4:** M4 done (26 slices, v1 on npm); the close lists the open retro
  proposals for the owner (`docs(M4): close the milestone`); none applied. Next: plan M5.
- **2026-11-24, L4.26:** v1 is on npm: `@list-picker/core@1.0.0` and `@list-picker/vanilla@1.0.0`,
  published by the owner; tag `v1.0.0` on `4384a16`. Criterion 1 checked against the registry:
  `npm install @list-picker/vanilla` in an empty folder brings both, and the vanilla README's
  example (strict types, a build, a drag and a keyboard move in Chrome) runs against them.
- **Next:** close M4 (SESSION §7: a docs pull request, merged only after the owner's ok; it takes
  the WebKit failures under Known issues).
- **2026-11-24, feat (owner):** the home's Install command switches by package manager (npm,
  yarn, pnpm: small links under it, radios and `:has()`, no script; npm without `:has()`); the
  READMEs keep npm only.
- **2026-11-24, fix (owner):** gentle hovers on the site and both demos: colours ease in (0.15s),
  text links thicken their underline, solid buttons lift a pixel and press back, the round buttons
  and the player's controls fill lightly; only where a pointer hovers (none after a tap), none
  with reduced motion, none during a theme switch, never on a card or a list (a drag test checks
  the Clone has no transition).
- **2026-11-24, fix (owner):** the nav's brand a step larger (1.05rem; two rows below 41rem);
  page titles shrink on phones and a package's name wraps after its scope, so no page scrolls
  sideways at 320px (`e2e/home.e2e.ts`).
- **2026-11-24, fix (owner):** the nav's demos carry a visible "demos:" label (hidden below
  22.5rem, where the line alone parts them; two rows below 40rem); the home's outlined button
  fills with the accent on hover (its label was invisible).
- **2026-11-24, fix (owner):** the nav's contents stop at the pages' widest content (64rem),
  centred, and line up with it on phones; its links come in two labelled lists, Docs (core,
  vanilla) and Demos (kanban, player), apart by a line.
- **2026-11-24, feat (owner):** a theme button on every page and both demos: automatic (the
  system's), light or dark, saved in the browser (`site/theme.ts`; an inline script in each
  `<head>` applies it before the page paints); `e2e/theme.e2e.ts`.
- **2026-11-24, fix (owner):** the player's equalizer bars alternate (three rhythms); the nav names
  both demos, "kanban" and "player" (addresses unchanged), and the home says "The kanban demo".
- **2026-11-24, L4.25 (owner):** the player's pretend play: no sound, ten times faster, play/pause,
  a progress bar, an equalizer, and the next track at a track's end in the current order (browser
  test with Playwright's clock); motion reduced on request.
- **2026-11-24, L4.25:** the player (`site/player.html`): the owner's first sketch, a playlist in
  one list: previous and next by `neighbours`, tick two tracks to swap (`swapCards`), drag and
  keyboard moves, a click or Enter plays; `e2e/player.e2e.ts`. The nav has a "player" link and two
  rows on phones.
- **2026-11-24, L4.22:** the project presents itself as lists people reorder (a kanban board, a
  playlist), not only kanban: the home, both READMEs, the packages' description and keywords, the
  root README and PRODUCT. Wording only; nothing removed.
- **2026-11-24, L4.24:** `Board.swapCards(a, b)`: two cards exchange places in O(1) (side by side,
  one moves; apart, each takes the other's place); the property test swaps at random and replays
  the emitted moves on a copy (a planted bug was caught).
- **2026-11-24, L4.23:** `Board.neighbours(cardId)`: the cards before and after a card in O(1)
  (the playlist's previous and next); the property test checks it for every card after every
  operation (a planted swap of prev and next was caught).
- **2026-11-24, fix (owner):** the brand's mark 20% larger and centred on the letters (tallest
  to baseline, measured to 0 px), not on the line the "p" pulls down; the phone nav's gap 0.75rem
  keeps it on one line at 375px.
  The home's two hero buttons get a 0.75rem gap (a flex row that wraps; at 320px they touched)
  and 8px more room before the skin chooser.
- **2026-11-24, docs (owner):** the home's links add the design decisions (on GitHub) and the
  project's origin, list-picker-js (2017, public, archived).
- **2026-11-24, fix (owner review of L4.21):** the demo reads top to bottom: title, skin chooser,
  board, "Edit the board" (sentence-like rows, labels muted), "Events" (per move two cards: a
  readable one and the JSON `on("move")` receives); status and error are live regions that take
  no room when empty; the brand's mark is drawn; the browser tests scroll the board into view.
- **2026-11-24, fix (owner report):** a card dropped below a short list (the board's background
  in its column) went back; off every list container the engine now takes the hovered list, else
  the nearest list above the pointer in its column (stacked lists too), and its end below it.
- **2026-11-24, fix (owner go):** the Pages workflow builds and uploads in one job and deploys in
  another: deploying in the uploading job kept finding no artifact (three attempts of one run
  failed).
- **2026-11-24, L4.21:** the demo in sections: the board under the title, then "Edit the board"
  (the forms in a grid) beside "Events"; every browser test unchanged.
- **2026-11-24, L4.20:** the demo's forms (one height, the site's colours, a select arrow of their
  own) and its list and card buttons (SVG icons in `currentColor`, `aria-label`s); the GitHub link
  is an Octocat button on every page.
- **2026-11-24, L4.19:** "Styling a board" in the vanilla README (and its site page): a starting
  CSS and seven rules from the skins' bugs, each checked against the engine.
- **2026-11-24, fix (owner note):** the demo's scrolling lists clipped the skins' card shadows (now
  padded); found with it, a tilted Clone drifted off the pointer (Pop: ~29px on a 560px drag)
  because the engine moved it with `transform`; it now writes the `translate` property.
- **2026-11-24, L4.18:** the demo's board in the three skins (Cards, Terminal, Pop), sharing the
  home's styles; its buttons and texts take each skin's colours; a browser test switches them.
- **2026-11-24, L4.17:** the demo in the site's look (palette, nav, Cards board); every browser
  test passes unchanged, the trace still finds no forced layout in `pointermove`.
- **2026-11-24, L4.16:** from the owner's patch 0004: the home's board in three skins (Cards,
  Terminal, Pop); the browser test switches them, checks nothing is redrawn and that a list's Clone
  and the Placeholder take each skin (the patch's list Clones did not: fixed).
- **2026-11-24, L4.15:** from the owner's patch 0003: a hero and a live board on the home (Cards
  skin, Doing capped at 3); `e2e/home.e2e.ts` drives it (Playwright now also serves the site on
  port 5181); the cap removed, it fails.
- **2026-11-24, L4.14:** from the owner's patch 0002 (merged by hand over L4.13): the site's own
  look and a section index beside each package's page.
- **2026-11-24, L4.13:** from the owner's patch 0001: the home lists the four packages with an
  Install chooser (React and Angular: no command yet), every `site/*.html` is a page, the demo
  links back. The site is live (L4.12's criterion 1: every page 200).
- **2026-11-23, L4.12:** the site: one Vite build of pages from the READMEs plus the demo,
  deployed by a Pages workflow on every merge; `homepage` points each package at its page.
- **Next:** L4.26 (first npm publish; the owner publishes from their account).
- **2026-11-23, fix (owner note):** the demo renames a list by clicking its title (an input in
  place) and a card in its dialog, instead of the browser's prompt. Found on the way: a click on a
  list's handle never activated in Chrome (the pointer capture sends the click to the list); the
  engine now remembers what the press was on.
- **2026-11-23, L4.11:** `canMove` (`createDrag` and `mount` options): the Placeholder never
  enters a refused place, the keyboard skips refused places; the demo caps Doing at 3 cards
  (browser test).
- **2026-11-23, L4.10:** `onActivate({ kind, id })` (`createDrag` and `mount` options): a click on
  a card or a list's handle that started no drag, or Enter on a focused one; Enter no longer picks
  up (DEC-15 amended). The click after a drag is swallowed (capture listener on `root`; Chrome
  fires none). The demo opens a dialog.
- **2026-11-23, L4.9:** `mount` runs a Renderer again for an item whose value is another object
  and swaps the new element in at the next write, keeping the focus and a keyboard pick up
  (`keyboard.replace`, under the `moving` guard: Chrome's `focusout`, seen red in the browser
  test). The demo renames lists and cards (✎) and exposes `window.board`.
- **2026-11-23, L4.8:** `Board.updateList(list)` and `updateCard(card)` replace a value in place
  (`change`, no `move`), over `LinkedList.replace`; the property test covers both (two planted
  bugs caught). `mount` does not redraw them yet (L4.9).
- **2026-11-23, L4.7:** both packages at `1.0.0`, ready for npm (`npm publish --dry-run` clean;
  tarballs installed into an empty folder run both README examples). Not yet on npm: after the
  merge the owner creates the `list-picker` npm org and publishes from `main`, then the agent tags
  `v1.0.0` and checks criterion 1 against the registry.
- **2026-11-23, L4.6:** the root README answers the lab's question with decisions 0001 and 0002
  (faster for the model, irrelevant next to layout; simpler for positions and events, not for
  drawing), lists the packages and how to repeat both measurements (rerun: same ranges).
- **2026-11-23, L4.5:** READMEs, MIT license and npm metadata for both packages; every README
  example was run in Chrome once. The owner left P3 and the API names to the agent:
  `Announcement.list` is now `listLabel`.
- **2026-11-23, L4.4:** live announcements for drags and keyboard moves, English by default,
  replaceable with `messages` (public API, additive); the demo labels cards and lists.
- **2026-11-23, L4.3:** lists move with the keyboard by their handle (← →, Esc back), through
  the same keyboard code as cards; `mount` makes handles focusable.
- **2026-11-23, L4.2:** cards move with the keyboard, in `createDrag`; `mount` makes cards
  focusable. Chrome blurs a focused element moved in the DOM (GOTCHAS).
- **2026-11-23, L4.1:** `mount` runs the Renderers in the `change` listener (their errors reach
  the caller) and writes nothing during a drag; a change that removes what the drag needs abandons
  it. The live check found the demo reading cards from a DOM that now lags; it now checks
  each id against the Board.
- **2026-11-23, plan M4:** M4 split into L4.1–L4.7 in PLAN; DEC-15 (keyboard: pick up, arrows,
  drop) and DEC-16 (English announcements, replaceable) accepted; P3 (license) added for the owner.
  The five M3 retro proposals landed (#41–#43).
- **2026-11-23, close M3:** every M3 slice landed as planned (L3.1–L3.4, PRs #36–#39); the owner
  checked the demo. Five retro proposals and two known issues are open for the owner.
- **2026-11-23, L3.4:** decision record 0002: a Chrome trace of real drags shows no forced layout
  in `pointermove`. Auto-scroll frames force one each (the `scrollTop` write after the
  Placeholder's move); scrolling first removed them but broke upward auto-scroll through scroll
  anchoring (caught in review), so the engine is unchanged. Every M3 slice is done.
- **2026-11-23, L3.3:** the playground is the demo board, drawn by `mount`; the browser tests pass
  unchanged. The owner checked the demo at the M3 close.
- **2026-11-23, L3.2:** `mount` follows the Board by id (one reconcile per microtask); each
  Renderer runs once per list or card, and a drop costs no DOM write.
- **2026-11-23, L3.1:** `mount` draws a Board from the user's Renderers into the DEC-13 markup and
  starts the drag; Renderers return an `HTMLElement` (the engine hides cards through `style`).
- **2026-11-23, plan M3:** M3 split into L3.1–L3.4 in PLAN; DEC-14 accepted (`mount` builds the
  containers and follows the Board by id); the layout claim gets a recorded trace (decision 0002).
  The five M2 retro proposals landed (#31–#34); STATE's known flake is fixed.
- **2026-11-23, close M2:** every M2 slice landed as planned (L2.1–L2.8, PRs #21–#28, plus the
  hotfix #29). Five retro proposals are open for the owner.
- **2026-11-23, hotfix (owner report):** a card's Placeholder copied the card's width, so it was
  too wide in a list with a scrollbar and too narrow coming from one. It now takes only the card's
  height (lists keep both). Browser tests now run with real scrollbars.
- **2026-11-23, L2.8:** dragging lists by a handle (one engine, two kinds: card and list); every
  M2 slice is done.
- **2026-11-23, L2.7:** auto-scroll; edges clipped to the window, found while checking in Chrome.
- **2026-11-23, L2.6:** Playwright browser tests in the gate, with the installed Chrome.
- **2026-11-23, L2.5:** Esc cancels a drag (`keydown` only during one).
- **2026-11-22, L2.4:** drop applies the move to the Board and the DOM; the playground's cards are
  draggable for real.
- **2026-11-22, L2.3:** the Placeholder follows the drop target (read, then write, per frame).
- **2026-11-22, L2.2:** the Clone follows the pointer (`transform`, one write per frame).
- **2026-11-22, L2.1:** `@list-picker/vanilla` and the drag start; `happy-dom` for engine tests; a
  `paths` entry lets the root typecheck see `core`'s source.
- **2026-11-22, plan M2:** M2 split into L2.1–L2.8 in PLAN; DEC-13 proposed (data attributes;
  the engine applies drops).
- **2026-11-22, close M1:** every M1 slice landed as planned (L1.1–L1.11, PRs #5–#15); the owner
  checked the playground in the browser. Five retro proposals are open for the owner.
- **2026-11-22, L1.11:** benchmark against an array board; decision record 0001 (DEC-06 holds:
  linked-list moves go from ~0.10 to ~0.18 µs as lists grow 50×, arrays from ~0.12 to ~1.46 µs; both
  tiny next to layout). A plain Node runner instead of `vitest bench` (each sample needs a fresh
  board); the review caught a warm-up and ordering bias in its first version.
- **2026-11-22, L1.10:** `Board.snapshot()`, cached and frozen; the Board property checks it and
  that it is replaced exactly when the Board changes; the playground renders from it.
- **2026-11-22, L1.9:** Board events (`move`, `change`) over a small internal emitter; the
  playground's event log.
- **2026-11-22, L1.8:** `moveList`; the Board property test. A first version starting from an
  empty Board never reached a card moved before itself (its model was wrong there and still passed);
  runs now start from a populated Board with 20 to 60 weighted operations (measured: ~550 changing
  card moves, ~700 list moves, ~300 same-place moves per run of the suite).
- **2026-11-22, L1.7:** `moveCard`; the naive remove-then-insert lost the card on a bad `before`
  (seen red), so every check now runs before the unlink. Playground move buttons and form; fixed a
  blank "to" select on first load (since L1.5).
- **2026-11-22, L1.6:** `removeCard`, `removeList` (its cards leave the card index); × buttons in
  the playground.
- **2026-11-22, L1.5:** `Board` with lists and cards, a card-to-list index; the playground now
  shows the Board (the plain linked-list view is gone; removing returns in L1.6).
- **2026-11-22, L1.4:** linked-list property test (`fast-check`), seen failing on three planted
  bugs. Nothing new in the playground (no new behaviour).
- **2026-11-22, L1.3:** `remove(id)` in O(1), clearing the removed node's links; the playground's
  remove buttons.
- **2026-11-22, L1.2:** `insertBefore` any existing node; the playground's "before" selector.
- **2026-11-22, L1.1:** `LinkedList` append and read, the playground. Absent nodes are `null`
  (`first`, `last`, `prev`, `next`); `get` of an unknown id is `undefined`. `insertBefore` takes only
  `null` until L1.2 widens it.
- **2026-11-22, M1 playground:** the owner wants to check each slice visually: L1.1 adds a Vite
  playground, every M1 slice extends it, and the owner checks it at the end of M1.
- **2026-11-22, plan M1:** M1 split into L1.1 to L1.11 in `docs/PLAN.md`; ROADMAP marks M0 done;
  ARCHITECTURE's model uses one `insertBefore(value, beforeId | null)`. `main` is protected
  (pull requests only; `gate`, `title`, `size`, `frozen`, `secrets` required).
- **2026-11-22, L0.1 runnable skeleton:** npm workspace, `packages/core`, TypeScript 7, Vitest 5,
  Biome 2, the gate in CI. Seen red: the smoke test, a badly formatted file, coverage at 25%.
- **2026-11-22, bootstrap:** the repository starts from the AI-flow boilerplate: `AGENTS.md`
  (`CLAUDE.md` imports it), skills in `.agents/skills/`, hooks in `.claude/hooks/`, and CI checks.
  Docs filled with the owner's design: linked-list model with an Index (DEC-06), headless
  (DEC-07), clone and placeholder in the flow (DEC-08), vanilla first then React and Angular
  (DEC-09), Pointer Events (DEC-10), move events with neighbours (DEC-11), one npm
  workspace (DEC-12). `docs/shared/CONTRACT.md` removed (single repository).
  Lessons from list-picker-js in ARCHITECTURE.
