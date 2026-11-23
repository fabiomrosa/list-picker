# list-picker state

What exists in this repository now. The code wins over this file: if they disagree, fix this file.
Every slice's pull request updates it (SESSION §3).

## Capabilities
- `LinkedList`: `insertBefore(value, beforeId | null)` (unknown `beforeId` throws), `remove(id)`,
  `get`, `has`, `size`, `first`, `last`, ordered iteration; duplicate ids throw. A property test
  checks every PRODUCT invariant of the list against an array model over 1000 random operation
  sequences.
- `Board<L, C>`: `addList(list, beforeListId | null)`, `addCard(listId, card, beforeCardId | null)`,
  `moveCard(id, toListId, beforeCardId | null)` (returns whether the order changed; validates
  everything before unlinking), `moveList(id, beforeListId | null)` (same rules), `removeCard`,
  `removeList` (with its cards), `getList`, `getCard`, `listOf(cardId)`, `lists()`,
  `cards(listId)`. Card ids are unique across the Board, list ids
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
  store it, one `requestAnimationFrame` per frame writes `transform`. Each frame the Placeholder
  goes, in the list container under the pointer, before the first visible card whose vertical
  middle is below the pointer, or to the end; gaps between cards follow the same rule, and the DOM
  is written only when its place changes.
- `mount(root, board, { renderList, renderCard })` (`@list-picker/vanilla`) returns `{ destroy }`:
  it appends to `root`, per list in Board order, a `div[data-lp-list]` holding the list Renderer's
  element (marked `data-lp-list-handle`) and a `div[data-lp-cards]` of the card Renderer's elements
  (each marked `data-lp-card`), then starts `createDrag`. Every Renderer runs and is checked first: a
  missing `root`, or a Renderer result that is not a new, detached `HTMLElement` (not in the
  document, not returned twice), throws and changes nothing; `destroy()` stops the drag and removes what it
  added. It follows the Board by id: after each `change` (in a microtask, so a drop's own DOM
  write comes first; several changes reconcile once) it renders only new lists and cards, removes
  the gone ones, and moves into Board order only the elements outside the longest run already in
  order, leaving the user's other
  children of `root`, the Clone and the Placeholder where they are. After a drop it writes nothing.
- Browser tests (`npm run e2e`, part of the gate): Playwright drags cards in the playground in
  Chrome: within a list, across lists, into an empty list, to the end of a tall list by
  auto-scroll, a list by its title; a click changes nothing.
- `npm run trace` drags cards and a list on the demo in Chrome with a performance trace and counts
  forced layouts by where they ran; the result is in `docs/decisions/0002-drag-layout-trace.md`
  (none in `pointermove`; one per drag start in the first animation frame).
- `npm run bench` compares the Board with an array board on seeded random moves; the result is in
  `docs/decisions/0001-linked-lists-vs-arrays.md` (about equal at 10 cards per list, ~3× faster at
  100, ~8× at 500).
- The demo board (`playground/`, `npm run dev`) is drawn by `mount` with its own Renderers: each
  card shows its neighbours and ↑ ↓ ← → × buttons, each list header (the drag handle) its card count
  and ← → ×; positions are read at click time and the neighbours, counts and button states refresh
  after every change. Forms add lists and cards at the end or before a chosen one and move cards
  (showing "same place" when nothing changed); the page logs every `move` event, the `change`
  count and the Snapshot version. A tall Backlog list (14 cards, lists scroll past 22rem) and a
  board narrower than its lists (52rem) show auto-scroll both ways. Styles live in the demo only.

An npm workspace with one package, `@list-picker/core`, that builds, and the gate
(`npm run verify`: Biome, `tsc`, Vitest with an 80% line floor, build) locally and in CI, plus the
title, size, frozen-files and secret checks.

## Modules
- `packages/core`: `LinkedList`, `Node` (`src/linked-list.ts`); `Board`, `MoveEvent`, `BoardEvents`,
  `Snapshot` (`src/board.ts`); `Emitter` (`src/emitter.ts`, internal).
- `playground/`: the demo board, a Vite page over the packages' source; not published, outside
  coverage.
- `packages/vanilla`: `createDrag` (`src/drag.ts`), `mount` (`src/mount.ts`); imports only types
  from `core`.
- `bench/`: the array board, seeded move fixtures, their equivalence test, the runner, and the drag
  trace (`drag-trace.ts`).

## Contract
None yet.

## Known issues
- A Board change made in code during an active drag is reconciled at once: it may move the hidden
  dragged card (or its list) in the DOM, which in a real browser can release the pointer capture,
  and removing the dragged card makes the drop throw `unknown id` (cleanup is correct). Deferring
  the reconcile until the drag ends would fix it (L3.2 review).
- A Renderer that throws during a reconcile after a change throws from a microtask (an uncaught
  error the caller of the Board operation cannot catch); nothing is written until a later change
  reconciles without error.

## Last session
- **2026-11-23, L3.4:** decision record 0002: a Chrome trace of real drags shows no forced layout
  in `pointermove`; auto-scroll frames forced one each (a `scrollTop` write after the Placeholder's
  move), fixed by scrolling first (12 → 1 forced layouts per run). Every M3 slice is done.
- **Next:** the owner checks the demo (`git pull && npm ci && npm run dev`), then "close M3".
- **2026-11-23, L3.3:** the playground is the demo board, drawn by `mount`; the browser tests pass
  unchanged. The owner's check of the demo in the browser is pending.
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
