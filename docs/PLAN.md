# list-picker plan

This repository's track of `docs/shared/ROADMAP.md`, with entries in the template of
`docs/shared/SESSION.md` §0. Slice ids start with `L`.

---

### L0.1 · Runnable skeleton
- **Status:** done (2026-11-22)
- **Goal:** an empty project that builds, formats, tests and runs, with its gate in CI.
- **Depends on:** DEC-12 (accepted), P1.
- **In scope:**
  - The npm workspace (root `package.json`, `tsconfig` base, strict) with `packages/core` empty but
    building: its `package.json`, `tsconfig`, `src/index.ts`.
  - Vitest and Biome at the ARCHITECTURE versions, pinned.
  - The formatter and linter, wired into the gate.
  - One smoke test in `packages/core/test/`.
  - Coverage in the gate, failing below the floor of `docs/CONVENTIONS.md` §5 (80% of lines).
  - CI: the `gate` job in `.github/workflows/ci.yml` running `npm run verify`.
  - `README.md`: Tech references, Requirements, Running locally, Config (as far as the skeleton
    goes).
  - The gate as one command (`npm run verify`), the same one CI runs.
- **Out of scope:** any feature; `packages/vanilla` and the others; Playwright; publishing.
- **Contract:** none.
- **Acceptance criteria:**
  1. `npm run verify` passes from a clean clone.
  2. A badly formatted file fails the gate (seen once).
  3. The smoke test passes, and fails when broken (seen once).
  4. Coverage below the floor fails the gate (seen once).
  5. CI is green on the pull request.
- **Files:** 15 (lockfile excluded): root `package.json`, `tsconfig.json`, `biome.json`,
  `.gitignore`, `packages/core/{package.json,tsconfig.json,src/index.ts,test/smoke.test.ts}`,
  `ci.yml`, `README.md`, PLAN, STATE, CONVENTIONS, ARCHITECTURE "Stack", GOTCHAS. Coverage is set
  by CLI flags, with no Vitest config file.
- **References:** ARCHITECTURE "Stack", GOTCHAS.

---

## M1 · Core model
Everything in `packages/core`, no DOM. Values are any object with a string `id`
(`T extends { id: string }`); positions are given DOM-style, by the id of the node to insert before,
or `null` for the end. Bad input throws an `Error` starting with `list-picker:` (CONVENTIONS §4).

**Playground and the owner's check.** L1.1 adds `playground/`, a local page (`npm run dev`) that
draws the model: every node as a box with its `id`, `prev` and `next`, and buttons for the
operations that exist. Every later M1 slice extends it with what it adds, as one more scope item and
one more acceptance criterion ("visible and usable in the playground", run once by the agent).
Slices merge as usual (SESSION §4); the owner checks the playground in the browser at the end of M1
(`git pull && npm ci && npm run dev`).

### L1.1 · Linked list: insert at the end and read
- **Status:** done (2026-11-22)
- **Goal:** a `LinkedList<T>` that holds values in insertion order, finds any of them by id in O(1)
  and iterates them in order.
- **Depends on:** L0.1, DEC-06.
- **In scope:**
  - `insertBefore(value, null)` appends; `get(id)` returns the Node (`value`, `prev`, `next`) or
    `undefined`; `has(id)`; `size`; `first`, `last`; iteration yields the values in order.
  - Inserting a value whose `id` is already in the list throws.
  - The playground: Vite as a dev dependency, `npm run dev`, `playground/index.html` and
    `playground/main.ts` drawing a `LinkedList` as boxes (`id`, `prev`, `next`) with an id field and
    an "append" button; errors shown on the page. Type-checked and linted like the packages,
    outside the coverage floor and never published.
- **Out of scope:** inserting before an existing node (L1.2), removing (L1.3); any styling beyond
  legible boxes.
- **Contract:** none. **Public API:** additive, `LinkedList`, `Node`.
- **Acceptance criteria:**
  1. An empty list has `size` 0, no `first`/`last`, and iterates nothing.
  2. Three appends iterate in insertion order, with `first`/`last` and `size` 3.
  3. `get(id)` returns the node whose `prev`/`next` are its neighbours; an unknown id gives
     `undefined`.
  4. Appending a duplicate id throws and leaves the list unchanged.
  5. `npm run dev` opens the playground; appending shows the new box with the right `prev`/`next`,
     and a duplicate id shows the error.
- **Files:** ~11 (lockfile excluded): `src/linked-list.ts`, `test/linked-list.test.ts`,
  `src/index.ts` (the real API replaces `packageName`), `test/smoke.test.ts` (removed), root
  `package.json`, `tsconfig.json` (include `playground`), `playground/index.html`,
  `playground/main.ts`, README "Running locally", PLAN, STATE.
- **References:** PRODUCT invariants, ARCHITECTURE "The model".

### L1.2 · Linked list: insert before a node
- **Status:** done (2026-11-22)
- **Goal:** a value can be inserted anywhere, before an existing node.
- **Depends on:** L1.1.
- **In scope:** `insertBefore(value, beforeId)` for the first node, a middle node and the last
  node; an unknown `beforeId` throws.
- **Out of scope:** removing.
- **Contract:** none. **Public API:** none (behaviour of an existing method).
- **Acceptance criteria:**
  1. Inserting before the first node makes the value `first`.
  2. Inserting before a middle or the last node puts it between the right neighbours, both
     directions of the links agreeing.
  3. An unknown `beforeId` throws and leaves the list unchanged.
- **Files:** ~4: `src/linked-list.ts`, its test, PLAN, STATE.
- **References:** PRODUCT invariants.

### L1.3 · Linked list: remove
- **Status:** done (2026-11-22)
- **Goal:** any value can be taken out of the list in O(1).
- **Depends on:** L1.2.
- **In scope:** `remove(id)` returns the value; works for the only, first, middle and last node; an
  unknown id throws. The removed node's links are cleared.
- **Out of scope:** moving (the Board composes remove and insert, L1.7).
- **Contract:** none. **Public API:** additive, `remove`.
- **Acceptance criteria:**
  1. Removing the only node leaves an empty list.
  2. Removing the first, a middle or the last node relinks its neighbours and updates
     `first`/`last`/`size`; `has(id)` is false afterwards.
  3. An unknown id throws and leaves the list unchanged.
  4. A removed id can be inserted again.
- **Files:** ~4: `src/linked-list.ts`, its test, PLAN, STATE.
- **References:** PRODUCT invariants.

### L1.4 · Linked list: invariants under random operations
- **Status:** done (2026-11-22)
- **Goal:** the PRODUCT invariants are proven over thousands of random operation sequences, not
  only the hand-picked cases.
- **Depends on:** L1.3.
- **In scope:** `fast-check` as a dev dependency; a property test that applies random inserts
  (end and before), removes and failing calls to a `LinkedList` and to a plain array model side by
  side, and after each step checks: same order as the array, `size`, `first`/`last`, every `get`
  agrees with iteration, `a.next === b` exactly when `b.prev === a`, ends are `null`.
- **Out of scope:** the Board (L1.8).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The property passes with at least 1000 runs.
  2. It fails when one invariant is broken on purpose in `linked-list.ts` (seen once, e.g. not
     clearing the Index on remove).
- **Files:** ~5 (lockfile excluded): `package.json`, `test/linked-list.property.test.ts`,
  ARCHITECTURE "Stack" (fast-check added), PLAN, STATE.
- **References:** PRODUCT invariants, CONVENTIONS §5.

### L1.5 · Board: add lists and cards
- **Status:** done (2026-11-22)
- **Goal:** a `Board` holds ordered Lists of ordered Cards, and finds any card and its List in O(1).
- **Depends on:** L1.3.
- **In scope:** `new Board()`; `addList(list, beforeListId | null)`; `addCard(listId, card,
  beforeCardId | null)`; `getList(id)`, `getCard(id)`, `listOf(cardId)`; iteration over Lists and
  over a List's cards. Card ids are unique across the Board; list ids across the Lists.
- **Out of scope:** removing (L1.6), moving (L1.7, L1.8), events (L1.9), Snapshot (L1.10).
- **Contract:** none. **Public API:** additive, `Board`.
- **Acceptance criteria:**
  1. Lists and cards come out in the order they were placed, including `before` positions.
  2. `listOf(cardId)` names the right List; unknown ids give `undefined`.
  3. A card id already on the Board, in any List, throws; so does a duplicate list id, an unknown
     `listId`, or an unknown `before` id. Nothing changes on a throw.
- **Files:** ~5: `src/board.ts`, `test/board.test.ts`, `src/index.ts`, PLAN, STATE.
- **References:** PRODUCT ubiquitous language, DEC-06.

### L1.6 · Board: remove cards and lists
- **Status:** done (2026-11-22)
- **Goal:** cards and whole Lists can be removed, and the Board forgets them.
- **Depends on:** L1.5.
- **In scope:** `removeCard(id)` and `removeList(id)` return what they removed; removing a List
  removes its cards from the Board's card index; unknown ids throw.
- **Out of scope:** moving.
- **Contract:** none. **Public API:** additive.
- **Acceptance criteria:**
  1. A removed card is gone from its List, `getCard` and `listOf`, and its id can be added again.
  2. A removed List takes its cards with it: none of their ids is found afterwards.
  3. Unknown ids throw and change nothing.
- **Files:** ~4: `src/board.ts`, its test, PLAN, STATE.
- **References:** PRODUCT invariants.

### L1.7 · Board: move a card
- **Status:** done (2026-11-22)
- **Goal:** a card moves within its List or to another one, before a given card or at the end,
  in O(1).
- **Depends on:** L1.6.
- **In scope:** `moveCard(id, toListId, beforeCardId | null)`: within a List and across Lists,
  into an empty List, to the end; returns whether the order changed. A move to the place the card
  already holds (before its own `next`, or before itself) changes nothing.
- **Out of scope:** events (L1.9).
- **Contract:** none. **Public API:** additive.
- **Acceptance criteria:**
  1. Moving within a List (up, down, to the end) gives the expected order.
  2. Moving to another List, including an empty one, gives both expected orders and `listOf`
     names the new List.
  3. A move to the same place returns `false` and changes nothing.
  4. Unknown card, List or `before` id, or a `before` card that is not in `toListId`, throws and
     changes nothing.
- **Files:** ~4: `src/board.ts`, its test, PLAN, STATE.
- **References:** DEC-06, DEC-08.

### L1.8 · Board: move a list, and the Board invariants
- **Status:** done (2026-11-22)
- **Goal:** Lists move like cards, and the Board's invariants hold under random operations.
- **Depends on:** L1.7, L1.4.
- **In scope:** `moveList(id, beforeListId | null)`, same rules as `moveCard`; a property test of
  random Board operations against a plain nested-array model: same order, every card in exactly one
  List, `listOf` agrees with iteration, no card lost or duplicated.
- **Out of scope:** events.
- **Contract:** none. **Public API:** additive.
- **Acceptance criteria:**
  1. `moveList` gives the expected order, returns `false` for the same place, and throws on unknown
     ids without changing anything.
  2. The Board property passes with at least 500 runs, and fails when `moveCard` is broken on
     purpose (seen once).
- **Files:** ~5: `src/board.ts`, `test/board.test.ts`, `test/board.property.test.ts`, PLAN, STATE.
- **References:** PRODUCT invariants.

### L1.9 · Board events
- **Status:** done (2026-11-22)
- **Goal:** a renderer or a backend can subscribe to what changed.
- **Depends on:** L1.8, DEC-11.
- **In scope:** `on(event, listener)` returns an unsubscribe function. `move` carries
  `{ kind: "card" | "list", id, fromListId, toListId, prevId, nextId }` (list moves: the list ids
  are `null`); `change` (no payload) fires after every add, remove and changing move. Events fire
  after the model is consistent; a listener that throws does not undo the change.
- **Out of scope:** async or batched events.
- **Contract:** none. **Public API:** additive, `on`, the `MoveEvent` type.
- **Acceptance criteria:**
  1. A changing `moveCard` or `moveList` emits exactly one `move` with the right neighbours (`null`
     at the ends) and one `change`.
  2. A move to the same place, and any call that throws, emit nothing.
  3. Adds and removes emit one `change` each; unsubscribing stops delivery.
- **Files:** ~7: `src/emitter.ts`, `test/emitter.test.ts`, `src/board.ts`, `test/board.test.ts`,
  `src/index.ts`, PLAN, STATE.
- **References:** DEC-09, DEC-11.

### L1.10 · Snapshot
- **Status:** done (2026-11-22)
- **Goal:** renderers that need arrays (React, Angular) read the Board as one immutable value.
- **Depends on:** L1.9.
- **In scope:** `board.snapshot()` returns a frozen
  `{ lists: readonly { list, cards: readonly Card[] }[] }` in Board order; a new snapshot object
  after each change, the same object while nothing changed.
- **Out of scope:** structural sharing between snapshots (only if the benchmark asks for it).
- **Contract:** none. **Public API:** additive, `snapshot`, the `Snapshot` type.
- **Acceptance criteria:**
  1. The Snapshot's order equals iteration of the Board, after any sequence of operations (added to
     the Board property).
  2. It is frozen at every level the library creates; mutating it throws in strict mode.
  3. Two calls with no change in between return the same object; a change gives a new one.
- **Files:** ~6: `src/board.ts`, `test/board.test.ts`, `test/board.property.test.ts`,
  `src/index.ts`, PLAN, STATE.
- **References:** DEC-06, DEC-09.

### L1.11 · Benchmark: linked lists against arrays
- **Status:** done (2026-11-22)
- **Goal:** the lab's question gets a measured answer for the model.
- **Depends on:** L1.10.
- **In scope:** `vitest bench` comparing the Board with an array-based board (find by id, then
  `splice`) for random card moves on boards of 10×10, 10×100 and 20×500 cards; an `npm run bench`
  script; the results, the machine and the conclusion written in
  `docs/decisions/0001-linked-lists-vs-arrays.md`.
- **Out of scope:** DOM cost (M3 traces it); a bench in the gate (timings are noisy).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `npm run bench` runs both implementations on the same random move sequences.
  2. The array implementation passes the same order checks as the Board on those sequences (the
     comparison is fair).
  3. The decision record states the numbers and whether DEC-06 holds for the model.
- **Files:** ~6: `bench/board.bench.ts`, `bench/array-board.ts`, `package.json`, the decision
  record, PLAN, STATE.
- **References:** PRODUCT "Measured, not assumed", DEC-06.

---

## M2 · Drag engine
Everything in `packages/vanilla` (`@list-picker/vanilla`), over the user's markup (DEC-13). Engine
tests run in `happy-dom` with synthetic pointer events (CONVENTIONS §5); real drags are checked in
the browser from L2.6. Every slice extends the playground with what it adds; the owner checks the
drag after L2.4 and at the end of M2. Styling hooks are attributes (`data-lp-*`), never inline
styles the user must fight, except the Clone's position and `translate`.

### L2.1 · Vanilla package and drag start
- **Status:** done (2026-11-22)
- **Goal:** pressing a card and moving past a small threshold starts a drag: the card's place is
  held by a Placeholder and a Clone appears over it.
- **Depends on:** M1, DEC-10, DEC-13.
- **In scope:**
  - `packages/vanilla` with `createDrag(root, board)` returning `{ destroy }`; `happy-dom` (dev).
  - Outside a drag, one `pointerdown` listener on `root`. On a card (`[data-lp-card]`): pointer
    capture, then `pointermove`/`pointerup` on the card until the drag ends.
  - Past 4 px: the Clone (`cloneNode(true)`, `data-lp-clone`, `position: fixed` at the card's rect,
    `pointer-events: none`), the Placeholder (`data-lp-placeholder`, the card's width and height)
    inserted before the card, the card hidden with `data-lp-dragging` and `hidden`.
  - Released before the threshold: nothing changes (a click still works).
  - `destroy()` removes every listener.
- **Out of scope:** following the pointer (L2.2), retargeting (L2.3), dropping (L2.4).
- **Contract:** none. **Public API:** additive, `createDrag`.
- **Acceptance criteria:**
  1. A press and release under 4 px leaves the DOM unchanged and adds no Clone.
  2. Past 4 px there is one Clone at the card's rect and one Placeholder of the card's size in the
     card's place; the card is hidden and marked `data-lp-dragging`.
  3. After `destroy()`, pressing a card does nothing.
  4. The playground's cards carry the attributes and show the Clone and Placeholder when pressed and
     moved (seen in the browser).
- **Files:** ~9: `packages/vanilla/{package.json,tsconfig.json,src/index.ts,src/drag.ts,test/drag.test.ts}`,
  root `package.json` (happy-dom), playground, PLAN, STATE.
- **References:** ARCHITECTURE "Request flow", GOTCHAS "DOM and drag", DEC-08.

### L2.2 · The Clone follows the pointer
- **Status:** done (2026-11-22)
- **Goal:** the Clone moves with the pointer smoothly, without forcing layout.
- **Depends on:** L2.1.
- **In scope:** `pointermove` only stores the pointer; one `requestAnimationFrame` per frame sets the
  Clone's `transform: translate(dx, dy)` from the press point; no layout read in the handler.
- **Out of scope:** retargeting the Placeholder.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. After moves and one animation frame, the Clone's transform equals the pointer's offset from the
     press point.
  2. Several moves within one frame cause one transform write.
  3. The Clone follows the pointer in the playground (seen in the browser).
- **Files:** ~5: `src/drag.ts`, its test, playground, PLAN, STATE.
- **References:** AGENTS "Non-negotiable" (layout reads).

### L2.3 · The Placeholder follows the drop target
- **Status:** done (2026-11-22)
- **Goal:** while dragging, the Placeholder shows where the card would land.
- **Depends on:** L2.2.
- **In scope:** each frame, the element under the pointer (`elementFromPoint`; the Clone ignores the
  pointer): over a card, the Placeholder goes before it when the pointer is above the card's
  vertical middle and after it otherwise; over a list container's empty space or below its last
  card, at the end; elsewhere it stays. The Placeholder moves only when its target changes.
- **Out of scope:** auto-scroll (L2.7).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Above a card's middle the Placeholder is right before it; below, right after it.
  2. Over an empty list, or below the last card, it is the list's last child.
  3. Outside every list it stays where it was; the DOM is not written when the target is unchanged.
  4. In the playground the Placeholder opens a gap where the card would land (seen in the browser).
- **Files:** ~5: `src/drag.ts`, its test, playground, PLAN, STATE.
- **References:** DEC-08, ARCHITECTURE "Request flow".

### L2.4 · Drop
- **Status:** done (2026-11-22)
- **Goal:** releasing the pointer moves the card to the Placeholder's place, in the model and the DOM.
- **Depends on:** L2.3.
- **In scope:** on `pointerup` after a drag: `board.moveCard(cardId, listId, beforeCardId)` from the
  Placeholder's list and its next card sibling (or `null`); the card element takes the
  Placeholder's place and is shown again; the Clone and the Placeholder are removed; the drag
  listeners are removed. If `moveCard` throws, the card goes back where it was and the error is
  rethrown.
- **Out of scope:** cancel (L2.5).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. A drop before a card or at the end of another list moves the card there in the Board and in the
     DOM, with one `move` event.
  2. A drop where the card was emits no `move` and leaves the DOM as it was.
  3. After a drop there is no Clone, no Placeholder, no `data-lp-dragging`, no drag listener.
  4. The playground's cards can be dragged within and across lists (seen in the browser).
- **Files:** ~5: `src/drag.ts`, its test, playground, PLAN, STATE.
- **References:** DEC-08, DEC-13.

### L2.5 · Cancel
- **Status:** done (2026-11-23)
- **Goal:** a drag can be abandoned with nothing changed.
- **Depends on:** L2.4.
- **In scope:** Esc (a `keydown` listener only during a drag), `pointercancel`, and `destroy()`
  during a drag: the card is shown where it was, the Clone and the Placeholder are removed, no move.
- **Out of scope:** keyboard dragging (M4).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Esc, `pointercancel` and `destroy()` during a drag each restore the DOM to its state before the
     drag, with no `move` event.
  2. No `keydown` listener exists outside a drag.
  3. Esc cancels a drag in the playground (seen in the browser).
- **Files:** ~5: `src/drag.ts`, its test, playground, PLAN, STATE.
- **References:** AGENTS "Non-negotiable" (listeners).

### L2.6 · Browser tests
- **Status:** done (2026-11-23)
- **Goal:** real drags in a real browser are checked by the gate.
- **Depends on:** L2.5.
- **In scope:** `@playwright/test` with the installed Chrome (`channel: "chrome"`; GitHub's Ubuntu
  runner has it, so nothing is downloaded); its web server runs the playground; `e2e/drag.e2e.ts`:
  drag a card within a list, across lists, into an empty list; a click without moving changes
  nothing. Added to `npm run verify`.
- **Out of scope:** other browsers.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The four scenarios pass locally and in CI.
  2. One fails when the drop is broken on purpose (seen once).
- **Files:** ~7: `playwright.config.ts`, `e2e/drag.e2e.ts`, root `package.json`, lockfile, `ci.yml`,
  `.gitignore`, ARCHITECTURE "Stack", PLAN, STATE.
- **References:** CONVENTIONS §5.

### L2.7 · Auto-scroll
- **Status:** done (2026-11-23)
- **Goal:** dragging near the edge of a scrollable list or the board scrolls it.
- **Depends on:** L2.6.
- **In scope:** during a drag, within 40 px of the edge of the nearest scrollable ancestor (a list
  container vertically, the board horizontally), scroll it each frame, faster closer to the edge;
  the Placeholder retargets after scrolling.
- **Out of scope:** window scrolling beyond what the browser does.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Holding the pointer near a scrollable list's bottom edge scrolls it; away from the edges, nothing
     scrolls (unit test with a stubbed scroll container).
  2. In the browser test, a card dragged to the bottom of a tall list reaches its last position.
  3. The playground has a tall list and a wide board to try it (seen in the browser).
- **Files:** ~6: `src/drag.ts` (or `src/auto-scroll.ts`), tests, `e2e/drag.e2e.ts`, playground,
  PLAN, STATE.
- **References:** DEC-08.

### L2.8 · Drag lists
- **Status:** done (2026-11-23)
- **Goal:** lists are reordered by dragging their handle.
- **Depends on:** L2.7.
- **In scope:** a press on `[data-lp-list-handle]` drags its `[data-lp-list]` with the same Clone,
  Placeholder, cancel and auto-scroll machinery, horizontally: before a list when the pointer is
  left of its middle, after it otherwise; drop calls `board.moveList`.
- **Out of scope:** dragging several cards at once.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Dragging a list's handle past another list's middle moves it there in the Board and the DOM.
  2. Pressing a card inside a list still drags the card, not the list.
  3. A browser test drags a list; the playground's lists have handles (seen in the browser).
- **Files:** ~6: `src/drag.ts`, its test, `e2e/drag.e2e.ts`, playground, PLAN, STATE.
- **References:** DEC-13.

## M3 · Vanilla adapter and demo
`mount(root, board, { renderList, renderCard })` in `packages/vanilla` (DEC-14): it builds the
containers with the `data-lp-*` attributes of DEC-13, puts the user's elements in them, starts the
drag engine, and follows the Board by id. The playground becomes the demo board at L3.3, and the
owner checks it then. Engine and mount tests run in `happy-dom`; the demo's drags stay covered by
the browser tests.

### L3.1 · Mount a Board
- **Status:** done (2026-11-23)
- **Goal:** one call draws a Board from the user's Renderers and makes it draggable.
- **Depends on:** M2, DEC-14.
- **In scope:**
  - `mount(root, board, { renderList, renderCard })` returning `{ destroy }`. For each list, in
    Board order: a `div[data-lp-list]` holding the element `renderList(list)` returns (marked
    `data-lp-list-handle`) and a `div[data-lp-cards]`; each card is the element `renderCard(card)`
    returns, marked `data-lp-card`. Then `createDrag(root, board)`.
  - A missing `root`, or a Renderer that returns anything but a new, detached `HTMLElement` (not
    in the document, not returned before), throws a `list-picker:` error and leaves `root` as it
    was.
  - `destroy()` destroys the drag and removes every element `mount` added.
- **Out of scope:** following Board changes made in code (L3.2), the demo (L3.3).
- **Contract:** none. **Public API:** additive, `mount`, `Mount`, `Renderers`.
- **Acceptance criteria:**
  1. After `mount`, `root` holds one list container per list and one card element per card, in
     Board order, each the Renderer's own element with the attributes added.
  2. A card dragged in a mounted Board moves in the Board and the DOM.
  3. A missing `root`, a non-element, a repeated or an attached element from a Renderer throws,
     and nothing in the document changes.
  4. After `destroy()`, `root` is as before `mount` and pressing a card does nothing.
- **Files:** ~6: `src/mount.ts`, `src/index.ts`, `test/mount.test.ts`, ARCHITECTURE, PLAN, STATE.
- **References:** DEC-07, DEC-13, DEC-14; ARCHITECTURE "Configuration".

### L3.2 · Follow the Board by id
- **Status:** done (2026-11-23)
- **Goal:** changes made in code (add, remove, move) show up without redrawing what did not change.
- **Depends on:** L3.1.
- **In scope:** on each `change`, reconcile `root` against the Snapshot by id: keep each list's and
  card's element, call a Renderer only for a new list or card, remove the elements of the ones that
  are gone, and move the rest into Board order (moving only those out of place). After a drop the
  engine has already moved the element, so nothing is written. `destroy()` also unsubscribes.
- **Out of scope:** updating a card's content (the Board has no such operation).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. After `addCard`, `removeCard`, `moveCard`, `addList`, `removeList` and `moveList`, the DOM
     matches the Board order.
  2. Each Renderer is called once per list or card over its life in the Board; a kept element is
     the same object (its focus and input state survive).
  3. After a drag-and-drop, the reconcile writes nothing to the DOM.
  4. After `destroy()`, a Board change touches nothing.
- **Files:** ~5: `src/mount.ts`, `test/mount.test.ts`, PLAN, STATE, GOTCHAS if needed.
- **References:** DEC-14.

### L3.3 · The demo board
- **Status:** done (2026-11-23)
- **Goal:** the playground becomes the demo: a board drawn by `mount` with the demo's own Renderers.
- **Depends on:** L3.2.
- **In scope:** `playground/main.ts` renders through `mount` (its own drawing code goes); its
  Renderers keep the cards' neighbours, the move and × buttons, and the list titles as handles; the
  forms and the event log stay outside the mounted root. Styles stay in the demo (DEC-07). The
  browser tests keep passing against it.
- **Out of scope:** publishing the demo (M4).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `npm run e2e` passes against the demo unchanged, or with only selector changes.
  2. Every playground control still works (run once live, reading the page as loaded).
  3. The owner checks the demo in the browser.
- **Files:** ~5: `playground/{main.ts,index.html}`, `e2e/drag.e2e.ts` if needed, PLAN, STATE.
- **References:** SESSION §3.3.

### L3.4 · Trace: no forced layout per pointer move
- **Status:** done (2026-11-23)
- **Goal:** the claim that a drag forces no layout in `pointermove` is measured, not assumed.
- **Depends on:** L3.3.
- **In scope:** record a Chrome performance trace of card and list drags on the demo (with
  auto-scroll); count forced (synchronous) layouts and where they come from; decision record 0002
  with the method, the numbers and the trace's summary. A forced layout inside `pointermove` found
  here is a fix in this slice if small, otherwise a known issue.
- **Out of scope:** an automated trace check in the gate.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Decision record 0002 states how the trace was recorded and reports forced layouts per
     `pointermove` (expected: zero).
  2. The record says how to repeat it.
- **Files:** ~3: `docs/decisions/0002-drag-layout-trace.md`, PLAN, STATE.
- **References:** AGENTS "Non-negotiable" (layout reads, performance claims), decision 0001.

## M4 · v1 release
Keyboard moving (DEC-15) and live announcements (DEC-16) in `packages/vanilla`, the two M3 known
issues fixed, the packages' READMEs, the lab write-up; then, before the first npm publish (the base
the React and Angular adapters build on), the rest of the v1 API (DEC-17): changing a list's or a
card's value, activating an item, rules for where items may move; and the site with the docs and
the demo. Engine and mount
tests run in `happy-dom`; keyboard moves also get browser tests. Every slice that adds behaviour
shows it in the demo.

### L4.1 · Mount: Renderer errors reach the caller, no DOM writes during a drag
- **Status:** done (2026-11-23)
- **Goal:** the two M3 known issues are gone.
- **Depends on:** M3.
- **In scope:**
  - Renderers run synchronously in `mount`'s `change` listener, so a Renderer error reaches the
    caller of the Board operation (the Board rethrows a listener's error); the DOM writes stay in
    the microtask.
  - While a drag is active, the DOM writes wait and run once when it ends (drop or cancel);
    `createDrag` tells `mount` when a drag ends through an internal option, not public API.
    Built as an internal `startDrag` (not exported from the package) that `createDrag` wraps.
  - Found while building: a change that removes the dragged card or list, or the list its
    Placeholder is in, abandons the drag at once (the drop could only fail); a drop goes before the
    next item the Board still holds there, past ones the DOM still shows but a change moved away;
    the Placeholder does not enter a list the Board removed; a card removed between the press and
    the threshold starts no drag (the last two from the review).
- **Out of scope:** keyboard moving (L4.2).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. A Renderer that throws makes the Board operation's call throw that error; nothing is written,
     and nothing already rendered is rendered again.
  2. A Board change made during a drag (including removing the dragged card) writes nothing until
     the drag ends; then the DOM matches the Board, and the drop of a removed card changes nothing
     and throws nothing.
  3. STATE's two known issues are removed.
- **Files:** ~6: `src/mount.ts`, `src/drag.ts`, `test/mount.test.ts`, GOTCHAS, PLAN, STATE.
- **References:** DEC-13, DEC-14; decision 0002 (frame order).

### L4.2 · Keyboard: move a card
- **Status:** done (2026-11-23)
- **Goal:** a card can be moved with the keyboard alone (DEC-15).
- **Depends on:** L4.1, DEC-15.
- **In scope:**
  - `mount` gives each card element `tabindex="0"` unless it has one.
  - One `keydown` listener on `root` (removed by `destroy()`). On a focused card: Space or Enter
    picks it up (`data-lp-grabbed`); ↑ ↓ move it one place within its list, ← → to the same
    position (or the end) in the neighbouring list, each a `board.moveCard` with the element moved
    by the engine (DEC-13) and focus kept; Space or Enter drops; Esc moves it back to where it was
    picked up; focus leaving the card drops it. Keys are ignored inside the card's controls.
  - A pointer drag and a keyboard move never run at once.
- **Out of scope:** lists (L4.3), announcements (L4.4), Esc reaching the page's other handlers
  (PLAN "Later").
- **Contract:** none. **Public API:** none (behaviour of `createDrag` and `mount`).
- **Acceptance criteria:**
  1. Space, ↓, ↓, Space moves a card two places down, in the Board and the DOM, with one `move`
     event per step; focus stays on the card.
  2. ← → move a card across lists, to the same position or the end; at the first or last list
     nothing happens.
  3. Esc after some moves puts the card back where it was picked up; focus leaving drops it.
  4. A browser test moves a card with the keyboard on the demo.
- **Files:** ~7: `src/drag.ts` (or a new `src/keyboard.ts`), `src/mount.ts`, their tests,
  `e2e/drag.e2e.ts`, PLAN, STATE.
- **References:** DEC-15; ARCHITECTURE "Lessons from list-picker-js".

### L4.3 · Keyboard: move a list
- **Status:** done (2026-11-23)
- **Goal:** lists move with the keyboard by their handle.
- **Depends on:** L4.2.
- **In scope:** the same pick up, ← →, drop and Esc on a focused `[data-lp-list-handle]` (`mount`
  gives it `tabindex="0"` unless it has one), each step a `board.moveList`.
- **Out of scope:** announcements (L4.4).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Space, →, Space on a handle moves its list one place right, with its cards; focus stays on
     the handle.
  2. Esc puts the list back; ↑ ↓ do nothing to a list.
  3. A browser test moves a list with the keyboard on the demo.
- **Files:** ~5: the keyboard source, its test, `e2e/drag.e2e.ts`, PLAN, STATE.
- **References:** DEC-15.

### L4.4 · Live announcements
- **Status:** done (2026-11-23)
- **Goal:** screen-reader users hear what a drag or a keyboard move does (DEC-16).
- **Depends on:** L4.3, DEC-16.
- **In scope:**
  - One visually hidden `aria-live="assertive"` region inside `root`, added by the engine and
    removed by `destroy()`. Built in the document's body instead (as dnd-kit does), so `root`
    holds only the user's markup.
  - Announcements for pick up, each move, drop and cancel, for cards and lists, by pointer and by
    keyboard: the item's id-derived label, its list and position ("Picked up Design the model. To
    do, position 1 of 2."). The label comes from the element's `aria-label` or text.
  - A `messages` option on `createDrag` and `mount` replaces any default message (a function per
    event receiving the label, list and position).
  - AGENTS "Language" names this one exception to "no user-facing text".
- **Out of scope:** translations shipped with the library.
- **Contract:** none. **Public API:** additive: the `messages` option and its type.
- **Acceptance criteria:**
  1. Each event writes its default message to the live region; a `messages` entry replaces it.
  2. Pointer drags announce pick up, drop and cancel (not every pointer move); keyboard moves also
     announce each step.
  3. After `destroy()`, the region is gone.
- **Files:** ~8: `src/announce.ts`, `src/drag.ts`, `src/mount.ts`, `src/index.ts`, tests, AGENTS,
  PLAN, STATE.
- **References:** DEC-16, DEC-07.

### L4.5 · Package READMEs and metadata
- **Status:** done (2026-11-23)
- **Goal:** each package explains itself on npm.
- **Depends on:** L4.4, P3 (license).
- **In scope:** `packages/core/README.md` and `packages/vanilla/README.md` (what it is, install,
  a complete example, the API, the `data-lp-*` attributes and styling hooks, keyboard keys,
  announcements); `package.json` fields `description`, `license`, `repository`, `keywords`,
  `sideEffects: false`; the `LICENSE` file; `npm pack --dry-run` lists only `dist`, the README and
  the license.
- **Out of scope:** the version and the publish (L4.7).
- **Deviation:** the owner left P3 and the API names to the agent: MIT, and `Announcement.list`
  became `listLabel` (it holds a label, not an id) before the README documents it; `DragOptions`
  and `Messages` stay. The `LICENSE` is copied into each package, since `npm pack` takes only the
  package's own.
- **Contract:** none. **Public API:** `Announcement.list` renamed `listLabel` (breaking, unreleased).
- **Acceptance criteria:**
  1. Each README's example runs as written (pasted into the demo once).
  2. `npm pack --dry-run` in each package lists exactly the expected files.
- **Files:** ~6: two READMEs, two `package.json`, `LICENSE`, STATE.
- **References:** DEC-12, DEC-07.

### L4.6 · The lab write-up
- **Status:** done (2026-11-23)
- **Goal:** the lab's question gets its written answer (ROADMAP "The end goal").
- **Depends on:** L4.5.
- **In scope:** the root `README.md`: the question (do linked lists make a board simpler and faster
  than arrays?), the answer with decisions 0001 and 0002 as data (model cost per move, layout per
  pointer move), what was simpler and what was not, how to repeat the measurements, and links to
  the packages and the demo (`npm run dev`).
- **Out of scope:** new measurements.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Every number in the write-up is in decision 0001 or 0002, with the record linked.
  2. A reader can repeat both measurements from the README alone.
- **Files:** ~3: `README.md`, PLAN, STATE.
- **References:** decisions 0001, 0002; DEC-06.

### L4.7 · Ready to publish
- **Status:** done (2026-11-23)
- **Note:** planned as the first npm publish; the owner then asked for the rest of the v1 API and
  a site first (L4.8–L4.25). The publish, the tag and criterion 1 against the registry moved to
  L4.26; the version stays `1.0.0`.
- **Goal:** v1 is on npm.
- **Depends on:** L4.6, P2 (npm account and package names).
- **In scope:** the package names from P2, version `1.0.0` in both packages (vanilla depending on
  core `^1.0.0`), `private` removed, `publishConfig.access: public` for a scope; the agent runs
  `npm publish --dry-run` in each; the owner runs the publish from their account; tag `v1.0.0`.
- **Out of scope:** a release workflow in CI.
- **Deviation:** each package gets `prepublishOnly: npm run build`, so a publish never ships a stale
  `dist`. Before the publish, criterion 1 was checked with `npm pack` tarballs installed into an
  empty folder (the core example in Node, the vanilla example in Chrome). The publish and the tag
  follow the merge, from `main`.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `npm install <vanilla name>` in an empty folder installs both packages, and the README example
     runs against the installed packages.
  2. The tag `v1.0.0` points at the published commit.
- **Files:** ~4: two `package.json`, `package-lock.json`, STATE.
- **References:** DEC-12; ROADMAP P2, P3.

### L4.8 · Change a list's or a card's value
- **Status:** done (2026-11-23)
- **Goal:** an app renames a list (its display name is the app's own field; the id never changes)
  or edits a card, through the Board.
- **Depends on:** DEC-17.
- **In scope:** `board.updateList(list)` and `board.updateCard(card)`: replace the stored value
  with the same id (same position), return the old one, emit `change` (no `move`), invalidate the
  Snapshot; an unknown id throws and changes nothing. The Board property test gains both
  operations. Core README.
- **Out of scope:** changing an id; the DOM (L4.9).
- **Deviation:** the id comes from the value (`updateCard(card)`, not `(id, card)`), so no
  "different id" error exists; `LinkedList.replace(value)` (public, additive) does the card swap.
- **Contract:** none. **Public API:** `Board.updateList`, `Board.updateCard`,
  `LinkedList.replace` (additive).
- **Acceptance criteria:**
  1. After `updateCard`, `getCard`, `cards()` and `snapshot()` return the new value in the same
     place; `change` fires once, `move` never.
  2. A wrong or unknown id throws and leaves the Board, its Snapshot and its listeners untouched.
- **Files:** ~6: `core/src/board.ts`, its tests and property test, core README, PLAN, STATE.
- **References:** DEC-17, DEC-06.

### L4.9 · Mount draws a changed value
- **Status:** done (2026-11-23)
- **Goal:** a renamed list or an edited card shows in the page at once.
- **Depends on:** L4.8.
- **In scope:** on `change`, `mount` runs the Renderer again for each list or card whose value is
  no longer the one it drew (by identity), checks the result like a new one, and puts the new
  element in the old one's place; the focus, a keyboard grab and the item's position stay. During a
  pointer drag of that item the swap waits until the drag ends, like every other write. The demo
  renames a list and edits a card. Vanilla README.
- **Out of scope:** diffing the user's element (the Renderer returns a new one).
- **Contract:** none. **Public API:** none (behaviour of `mount`).
- **Acceptance criteria:**
  1. `updateList` then a microtask: the list's header is the Renderer's new element, its cards
     untouched (no other Renderer runs, no other element moves).
  2. A focused (or keyboard-grabbed) card that is updated keeps the focus (and the grab) on its new
     element; the announcements use the new label.
  3. A Renderer error on update throws from `updateCard`, and the old element stays.
- **Files:** ~7: `vanilla/src/mount.ts`, `keyboard.ts`, tests, demo, vanilla README, PLAN, STATE.
- **Note:** the demo exposes its Board as `window.board`, so the browser test can update a
  picked-up card from code (as a server push would) without moving the focus.
- **References:** DEC-17, DEC-14.

### L4.10 · Activate a card or a list
- **Status:** done (2026-11-23)
- **Goal:** clicking a card (or pressing Enter on it) opens the app's modal, and a drag never does.
- **Depends on:** L4.9, DEC-17, DEC-15 (amended).
- **In scope:** an `onActivate({ kind, id })` option of `createDrag` and `mount`, called on a click
  on a card or a list handle that started no drag, and on Enter on a focused card or handle (not
  while one is picked up). The click that ends a pointer drag never reaches the card or the page
  (one capture-phase `click` listener on `root`, removed by `destroy()`). Clicks and Enter on
  controls inside an item keep their own behaviour. Enter no longer picks up; Space does (DEC-15
  amended); the e2e and the READMEs follow. The demo opens a dialog.
- **Out of scope:** double-click, long press, a context menu.
- **Contract:** none. **Public API:** `onActivate` in the options (additive); Enter's behaviour
  changes (unreleased).
- **Acceptance criteria:**
  1. A click without a drag calls `onActivate` once; a drag and drop calls it never, and the user's
     own `click` listener on the card does not fire either.
  2. Enter on a focused card calls `onActivate`; Space picks it up; Enter on a button inside it
     only presses the button.
- **Files:** ~10: `drag.ts`, `keyboard.ts`, `announce.ts` (options), `mount.ts`, tests, e2e, demo,
  both READMEs or vanilla's, PLAN, STATE.
- **Note:** Chrome fires no click after a drag at all (the card is hidden), so the browser test
  checks only that nothing opens; the swallowing of a following click is tested in happy-dom.
  `DragOptions` moved from `announce.ts` to `drag.ts` (same export).
- **References:** DEC-17, DEC-15.

### L4.11 · Rules for where items may move
- **Status:** done (2026-11-23)
- **Goal:** an app locks a card, keeps a list from receiving cards, or caps a list's cards.
- **Depends on:** L4.10, DEC-17.
- **In scope:** a `canMove({ kind, id, toListId, beforeId })` option of `createDrag` and `mount`
  (`toListId` `null` for a list), asked before a move is shown or applied: the Placeholder never
  enters a refused place (it stays at the last allowed one; the start place is always allowed), so
  the drop applies only an allowed place, and a locked item drags but lands where it was; a
  keyboard step to a refused place is skipped to the next allowed one in that
  direction, or does nothing. The Board itself is not guarded (the app's own calls are the app's).
  The demo caps "Doing".
- **Out of scope:** async rules; visual hints beyond the existing attributes.
- **Contract:** none. **Public API:** `canMove` in the options (additive).
- **Acceptance criteria:**
  1. With a rule refusing list B, a pointer drag over B leaves the Placeholder where it was and
     the drop lands there; the arrow into B skips it.
  2. A rule refusing every move of a card: pointer and keyboard leave it in place, with no
     `move` event.
  3. No `canMove`: behaviour unchanged (every existing test passes).
- **Files:** ~9: `drag.ts`, `keyboard.ts`, `announce.ts` (options), tests, demo, vanilla README,
  PLAN, STATE.
- **References:** DEC-17.

### L4.12 · The site
- **Status:** done (2026-11-23)
- **Goal:** one site introduces the project and documents each package, with the live demo.
- **Depends on:** L4.11; the owner turns on GitHub Pages (source: GitHub Actions).
- **In scope:** a Vite multi-page site in `site/`: home (what it is, the lab's answer, links), a
  page per package built from its README (one source for npm and the site), the demo board; a
  workflow that builds it on every merge to `main` and deploys to GitHub Pages
  (`fabiomrosa.github.io/list-picker`); `homepage` in both `package.json`. Later adapters add one
  page each.
- **Out of scope:** a docs framework, versioned docs, search.
- **Note:** two Vite builds (`npm run site:build`): `site/` (pages from the READMEs with `marked`,
  a dev dependency) and `playground/` into `dist-site/demo/`. Links leaving the site go to GitHub;
  a package's GitHub link goes to its page. Each package's `homepage` is its page. Criterion 1 is
  checked after the merge, on the deployed site.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. After the merge the site is live, and every page and the demo work there.
  2. A README change shows on the site after the next merge, with no other edit.
- **Files:** ~10: `site/` (pages, build config), workflow, two `package.json`, root README,
  PLAN, STATE; may split into skeleton plus deploy, and package pages.
- **References:** DEC-12, DEC-07.

### L4.13 · The site for every package
- **Status:** done (2026-11-24)
- **Goal:** the home presents the four packages and how to install each; a later package needs
  only its page.
- **Depends on:** L4.12.
- **In scope:** from the owner's patch 0001 (list-picker-js): the build takes every `site/*.html`
  as a page; a README link to any `packages/<name>` goes to `<name>.html`; the home: what it is, a
  table of `core`, `vanilla`, `react`, `angular` (the last two "coming soon", no page), an Install
  chooser (vanilla, React, Angular; radios, no script; React and Angular say "coming soon", no
  command, until they are published), the lab's answer, links to the demo and GitHub. The demo
  links back to the site.
- **Out of scope:** `react.html`, `angular.html` and their demos (M5, M6).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The built home shows the four packages and one install line at a time, switched by pointer
     and by arrow keys; no line installs a package that does not exist.
  2. The demo's link opens the site.
- **Files:** ~6: `site/index.html`, `site/style.css`, `site/vite.config.ts`,
  `playground/index.html`, PLAN, STATE.
- **References:** L4.12.

### L4.14 · The site's look and a section index
- **Status:** done (2026-11-24)
- **Goal:** the site has its own look, and a package's page shows the index of its sections.
- **Depends on:** L4.13.
- **In scope:** from patch 0002: monospace headings and navigation, a warm palette in light and
  dark, code blocks as a terminal, `$` before install lines; the build puts an index of a README's
  `##` sections beside a package's page (sticky, hidden on narrow screens).
- **Out of scope:** web fonts (system stacks only); the home's board (L4.15).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `core.html` and `vanilla.html` list every `##` section of their README, each link reaching it.
  2. Every page reads in light and dark, and none scrolls sideways at 375px.
- **Files:** ~6: `site/style.css`, `site/vite.config.ts`, `site/core.html`, `site/vanilla.html`,
  PLAN, STATE.
- **References:** L4.12.

### L4.15 · A live board on the home
- **Status:** done (2026-11-24)
- **Goal:** a visitor tries the library on the home page.
- **Depends on:** L4.14.
- **In scope:** from patch 0003: a hero (tagline, Install and demo buttons) and a Board drawn by
  `mount` from `site/home.ts` (three lists, Doing capped at 3 with `canMove`) in a Cards skin
  (`data-skin`, `site/home.css`); a narrower navigation on phones; a browser test of the home
  (the patch has none).
- **Out of scope:** the skin chooser (L4.16); activation and renaming (the demo has them).
- **Note:** the browser test drives the site's dev server (`vite site`), not the build; the build
  was checked by hand. Cards and titles have `touch-action: none` (GOTCHAS), so on a phone a swipe
  on them does not scroll the page; the gaps do. A list's Clone has no `data-lp-list`, so the skin
  matches it with `[data-lp-clone]:has(> [data-lp-cards])`.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. On the built home a card moves by pointer and by keyboard, and Doing takes no fourth card
     (browser test).
  2. The Clone and the Placeholder take the skin's look.
- **Files:** ~7: `site/index.html`, `site/home.ts`, `site/home.css`, `site/style.css`, an e2e
  test (and its config, to serve the site), PLAN, STATE.
- **References:** DEC-07, DEC-17.

### L4.16 · Skins for the home's board
- **Status:** done (2026-11-24)
- **Goal:** the home shows the same board in three looks: the look is the user's (DEC-07).
- **Depends on:** L4.15.
- **In scope:** from patch 0004: a skin chooser (Cards, Terminal, Pop; radios) that only changes
  the board's `data-skin`; the Terminal and Pop styles in `site/home.css`.
- **Out of scope:** more skins; remembering the choice.
- **Note:** as in L4.15, a list's Clone is matched by `[data-lp-clone]:has(> [data-lp-cards])`
  (the patch's skins missed it); in Pop it is white, having no place among the lists' colours.
  Review fixes over the patch: Terminal inverts only cards and titles (a picked-up list hid its
  cards' text), Pop's colours count lists only (they shifted during a drag), the chooser's radios
  are visually hidden off the text and named as a group, the skin follows a restored radio.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Each skin restyles the same board, the Clone and the Placeholder included, without redrawing
     it; a move made in one skin shows in the others (browser test).
- **Files:** ~6: `site/index.html`, `site/home.ts`, `site/home.css`, the e2e test, PLAN, STATE.
- **References:** DEC-07.

### L4.17 · The demo in the site's look
- **Status:** done (2026-11-24)
- **Goal:** the demo (`/demo/`) looks like the rest of the site instead of a bare playground.
- **Depends on:** L4.16.
- **In scope:** the demo takes the site's stylesheet (`site/style.css`: palette in light and dark,
  monospace headings, the top navigation instead of the lone back link) and its board the Cards
  look of the home; the forms, buttons, status, error and event log restyled with the site's
  tokens. What the browser tests and the trace rely on stays: the Backlog list scrolls past 22rem,
  the board is narrower than its lists (52rem), real scrollbars, the selectors.
- **Out of scope:** the skin chooser on the demo (L4.18, asked by the owner afterwards); new demo
  behaviour.
- **Note:** the demo's styles moved to `playground/demo.css`, imported after `site/style.css` by
  `main.ts`. The header is kept compact: the auto-scroll tests drag to the Backlog's bottom inside
  a 720px window (it ends at 704px). The trace: 0 forced layouts in `pointermove`; 381 frames, 12
  forced layouts and 38 style recalcs in them (374, 12 and 34 in decision 0002).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The demo shows the site's navigation and palette, in light and dark, and reads at 375px
     without the page scrolling sideways.
  2. Every browser test passes unchanged, and `npm run trace` still finds no forced layout in
     `pointermove`.
- **Files:** ~5: `playground/index.html`, `playground/main.ts` (the stylesheet), PLAN, STATE.
- **References:** L4.14, L4.15, decision 0002.

### L4.18 · Skins on the demo
- **Status:** done (2026-11-24)
- **Goal:** the demo shows its whole board (renaming, dialog, rules, event log) in the three skins
  of the home, to show that the look is the user's (DEC-07).
- **Depends on:** L4.17.
- **In scope:** the home's skin chooser (Cards, Terminal, Pop) on the demo, changing only its
  board's `data-skin`; the skins' styles no longer tied to the home's board (`#hero-board`), so
  both boards use the same rules; the demo's Renderers take the skins' classes; each skin also
  styles the demo's own parts (the ↑ ↓ ← → × buttons, the neighbours line). What the browser
  tests and the trace rely on stays (the default skin, the sizes of L4.17).
- **Out of scope:** more skins; remembering the choice.
- **Note:** the skins stay in `site/home.css`, keyed on `[data-skin]` and the `hb-*` classes a
  board's Renderers set (the title and card text took `hb-title`, `hb-text`); the demo imports it.
  The chooser shares the title's row, so the Backlog still ends inside the tests' 720px window.
  Trace: 0 forced layouts in `pointermove`.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. On the demo each skin restyles the same board, nothing redrawn, and a move made in one shows
     in the others (browser test).
  2. Every existing browser test passes unchanged, and the home's skins look as before.
- **Files:** ~8: `site/home.css` (or a shared skins stylesheet), `playground/index.html`,
  `playground/main.ts`, `playground/demo.css`, `e2e/drag.e2e.ts`, PLAN, STATE.
- **References:** L4.16, L4.17, DEC-07.

### L4.19 · Styling a board
- **Status:** done (2026-11-24)
- **Goal:** someone styling their board avoids the traps the site's skins fell into.
- **Depends on:** L4.18.
- **In scope:** a "Styling a board" section in the vanilla README (so on the site's vanilla page
  too): a minimal CSS example, and the rules learnt in L4.15–L4.18: what is dragged needs
  `touch-action: none`; a list's Clone has no `data-lp-list` (match it by what it holds); the
  Placeholder and the hidden item are siblings during a drag (`:nth-child(… of …)`); a keyboard
  pick up of a list marks the whole list; an outline outside a card is clipped by a scrolling list.
- **Out of scope:** a default theme (PRODUCT: out of v1); code changes.
- **Note:** seven rules in the end. Checking rule 3 against the source found that a `rotate` on
  the Clone pulled it off the pointer (fixed in #69: the engine writes `translate`); the review
  added a transformed ancestor (rule 7), the Clone among `:nth-child` siblings and the pick-up
  style; `cursor` on the Clone never shows (`pointer-events: none`).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Each rule in the section is true of the engine (checked against the source) and shows the
     selector to use; the example's CSS, pasted into the README's example page, drags by touch.
- **Files:** ~3: `packages/vanilla/README.md`, PLAN, STATE.
- **References:** L4.15–L4.18, GOTCHAS, DEC-07.

### L4.20 · The demo's controls
- **Status:** done (2026-11-24)
- **Goal:** the demo's forms and its list and card buttons look like the site, in every skin and
  theme, and say what they do to a screen reader.
- **Depends on:** L4.19.
- **In scope:** the forms' fields, selects and buttons at one height, the site's corners and
  colours in light and dark, a select arrow of their own, labels in the headings' font, a visible
  focus; the ↑ ↓ ← → × buttons of lists and cards drawn as SVG icons in `currentColor` (so each
  skin colours them), one size, readable hover, focus and disabled states, and an `aria-label`
  ("move Design the model up") instead of a bare glyph.
- **Out of scope:** new demo behaviour; the selectors the tests use (`data-role`); the compact
  header the auto-scroll tests need.
- **Note:** asked by the owner during the slice: the navigation's GitHub link became a round button
  apart from the pages, with the Octocat (Octicons' `mark-github`, MIT) and a visually hidden "GitHub",
  on every page; the nav now fits one line at 375px. Icon contrast, every button in every
  skin: enabled 8.8–18.9:1, disabled 3.7–6.0:1 (opacity 0.6).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Every browser test passes unchanged; screenshots in each skin and theme show the controls
     aligned.
  2. The buttons, disabled ones included, pass WCAG AA contrast (3:1 for icons) in each skin.
- **Files:** ~5: `playground/main.ts`, `playground/demo.css`, `playground/index.html`, PLAN, STATE.
- **References:** L4.17, L4.18.

### L4.21 · The demo's layout
- **Status:** done (2026-11-24)
- **Goal:** the demo reads in sections: the board first, then what edits it and what it reports.
- **Depends on:** L4.20.
- **In scope:** chosen by the owner: the title and the skin chooser, then the board at full width,
  then two panels side by side (stacked on phones): "Edit the board" (the three forms aligned in a
  grid, the status and error inside) and "Events" (the log and the change and Snapshot counts).
  Room between sections instead of the compact header: the auto-scroll browser tests bring the
  board into view first (as the home's tests do), so the page no longer has to fit 720px.
- **Out of scope:** new demo behaviour; the selectors the tests use.
- **Note:** with the forms below it, the board starts higher (the Backlog ends at 576px), so the
  auto-scroll tests needed no move. The board fills the width (no 52rem cap): it scrolls sideways
  when the window is narrower than its lists, so those two tests and the trace use a 900px window
  to keep a drop hit-tested inside a sideways-scrolled board. Reworked after the owner saw it
  (#77): the title as on the site's other pages, the skin chooser right above the board, then
  "Edit the board" and "Events" stacked at full width (side by side squeezed both); the forms read
  as sentences (verbs and prepositions alike, muted like the event cards' labels); empty status and error take no room; each
  event is two cards of one height: its kind and name, then from / to and after / before in
  fixed places; beside it the JSON `board.on("move")` receives. On a phone a form's name goes above its fields.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Screenshots at 1280 and 375, light and dark, show the three sections apart; no page scrolls
     sideways.
  2. Every browser test passes (the auto-scroll ones scroll the board into view first), and
     `npm run trace` still finds no forced layout in `pointermove`.
- **Files:** ~6: `playground/index.html`, `playground/demo.css`, `e2e/drag.e2e.ts`,
  `bench/drag-trace.ts` (if it needs the board in view), PLAN, STATE.
- **References:** L4.17, L4.20.

### L4.22 · Ordered lists, not only kanban
- **Status:** done (2026-11-24)
- **Goal:** the project presents itself as what the owner first imagined: ordered lists that people
  reorder, a kanban board being one case and a playlist another.
- **Depends on:** L4.21.
- **In scope:** wording only, nothing removed: the site's home (tagline, lede), both READMEs' intros,
  the packages' `description` and `keywords` (adding "playlist", "sortable list"), the root README
  and PRODUCT's vision; the kanban stays as an example. The owner sees the new texts before the
  merge.
- **Out of scope:** renaming the API (Board, List, Card stay); new behaviour.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. No page or README calls the library "kanban" only; the kanban demo, the home's board and
     every API stay.
- **Files:** ~8: `site/index.html`, two READMEs, two `package.json`, `README.md`,
  `docs/shared/PRODUCT.md`, STATE.
- **References:** DEC-07; the owner's sketch (a playlist).

### L4.23 · A card's neighbours
- **Status:** done (2026-11-24)
- **Goal:** an app steps to the previous or next item (a playlist's previous and next track) in
  O(1), the doubly linked list's own strength.
- **Depends on:** L4.22.
- **In scope:** `board.neighbours(cardId)` returning `{ prev, next }` (the cards' values, `null` at
  an end); an unknown id throws. Unit and property tests; core README.
- **Out of scope:** neighbours of a list; wrapping around at the ends (the app's choice).
- **Note:** built before L4.22 merged: L4.22's wording waits on its branch to go out with the
  music player (L4.25), so the site never names a playlist it does not show.
- **Contract:** none. **Public API:** `Board.neighbours` (additive).
- **Acceptance criteria:**
  1. After any sequence of operations, `neighbours` matches the cards' order (property test).
- **Files:** ~5: `core/src/board.ts`, its tests, core README, PLAN, STATE.
- **References:** DEC-06.

### L4.24 · Swap two cards
- **Status:** done (2026-11-24)
- **Goal:** an app swaps two items' places (pick one, then the other), in O(1).
- **Depends on:** L4.23.
- **In scope:** `board.swapCards(a, b)`: the two cards exchange places, in one list or across
  lists; a no-op for the same card; unknown ids throw and change nothing; it emits `move` events
  as moves do (persistence unchanged) and one `change`. Unit and property tests; core README.
- **Out of scope:** swapping lists; a pick-and-swap mode in the engine (the app builds it on
  `swapCards`; it moves into the library only if adapters repeat it).
- **Contract:** none. **Public API:** `Board.swapCards` (additive).
- **Acceptance criteria:**
  1. After any sequence of operations including swaps, the Board matches the reference model, and
     replaying the emitted `move` events on a copy gives the same order (property test).
- **Files:** ~5: `core/src/board.ts`, its tests, core README, PLAN, STATE.
- **References:** DEC-06, DEC-11.

### L4.25 · The music player example
- **Status:** done (2026-11-24)
- **Goal:** the site shows a second use of the library beside the kanban: the owner's playlist.
- **Depends on:** L4.24.
- **In scope:** a page in the site (`player.html` or a `player/` demo build, linked from the nav and
  the home): an album header with the current track, previous and next (`neighbours`), a playlist
  drawn by `mount` (one list), each track with a checkbox to pick it and pick another to swap
  (`swapCards`), plus the engine's drag and keyboard moves; a browser test. The kanban demo stays.
- **Out of scope:** playing audio, Spotify (the sketch's extras).
- **Note:** `site/player.html` (Coldplay's "Parachutes", as in the sketch); a click or Enter plays
  a track (`onActivate`). With a fifth link the nav no longer fits a phone's width: below 30rem it
  takes two rows (the brand and GitHub, then the pages). L4.22's wording merges right before it.
  Then, asked by the owner instead of audio samples (licensing, an outside service): a pretend
  play, no sound, ten times faster: play/pause, a progress bar, an equalizer on the playing track,
  and at a track's end the next one by `neighbours`, in the playlist's current order.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Previous and next step through the playlist in its current order; picking two tracks swaps
     them; a drag or a keyboard move reorders it (browser test).
- **Files:** ~7: the page, its script and styles, the site's build if needed, an e2e test, PLAN,
  STATE.
- **References:** L4.23, L4.24, DEC-07.

### L4.26 · First npm publish
- **Status:** done (2026-11-24)
- **Goal:** v1 is on npm.
- **Depends on:** L4.25, P2.
- **In scope:** a last `npm publish --dry-run` of both; the owner publishes from `main`, core
  first; the agent tags `v1.0.0` on that commit and checks criterion 1 against the registry.
- **Out of scope:** a release workflow in CI.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `npm install @list-picker/vanilla` in an empty folder installs both packages, and the README
     example runs against them.
  2. The tag `v1.0.0` points at the published commit.
- **Files:** ~2: PLAN, STATE.
- **References:** DEC-12; ROADMAP P2.

## M5 · React adapter

### L5.1 · The engine leaves a pointer drop to the renderer
- **Status:** done (2026-11-25)
- **Goal:** a renderer that draws from the Snapshot can let the pointer drag change only the Board.
- **Depends on:** DEC-18.
- **In scope:** `moveElements` in `DragOptions` (default `true`); with `false`, a drop calls
  `moveCard`/`moveList`, removes the Placeholder and the Clone and shows the item where it was,
  moving no element; with `false`, a Board change that removes the dragged item or the
  Placeholder's list cancels the drag; `@list-picker/vanilla` 1.1.0 (package and lockfile).
- **Out of scope:** the keyboard (L5.2); React.
- **Contract:** none. **Public API:** `DragOptions.moveElements` (additive, vanilla 1.1.0).
- **Acceptance criteria:**
  1. With `moveElements: false`, a drop changes the Board and leaves every element where it was; a
     refused place (`canMove`) or Esc changes nothing.
  2. With it, removing the dragged card or the Placeholder's list mid-drag cancels the drag, and the
     release does nothing.
  3. The existing drag tests pass unchanged (the default).
- **Files:** ~7: `drag.ts`, its test, the vanilla README, `packages/vanilla/package.json`, the
  lockfile, PLAN, STATE.
- **References:** DEC-13, DEC-18; `mount`'s drag cancel (L3.x).

### L5.2 · A keyboard pick-up survives the renderer's redraw
- **Status:** done (2026-11-25)
- **Goal:** with `moveElements: false`, moving by keyboard keeps working while the renderer redraws.
- **Depends on:** L5.1.
- **In scope:** with `false`, a step and Esc change only the Board; while a pick-up lasts, a
  `MutationObserver` on `root` finds the item's element by id after each commit, puts
  `data-lp-grabbed` and the focus back on it, and the `focusout` of the redraw does not release
  it; the origin is kept by id; the observer is disconnected on release and by `destroy()`; a
  browser test page in the playground that redraws from the Snapshot (in the `change` listener,
  and in a microtask), as React does.
- **Out of scope:** React.
- **Contract:** none. **Public API:** none (the option of L5.1).
- **Acceptance criteria:**
  1. In Chrome, on the redrawing page, several steps within and across lists keep the pick-up and
     the focus on the item's element, each announced as a move; Space drops, Esc puts the Board
     back.
  2. Release and `destroy()` disconnect the observer; the existing keyboard tests pass unchanged.
- **Files:** ~7: `keyboard.ts`, its test, a playground page and its script, an e2e test, PLAN,
  STATE.
- **References:** DEC-15, DEC-18; GOTCHAS (Chrome's `focusout` on a moved element).

### L5.3 · The React package and the Board as state
- **Status:** done (2026-11-25)
- **Goal:** a React component re-renders from the Board's Snapshot whenever the Board changes.
- **Depends on:** L5.2, DEC-18.
- **In scope:** `packages/react` at 1.0.0 (ESM, types, `sideEffects: false`, LICENSE, `files`,
  `homepage`, `publishConfig`, `prepublishOnly`; peer `react` `^18.3.0 || ^19.0.0`; core `^1.0.0`
  and vanilla `^1.1.0`); `useBoard(board)` with `useSyncExternalStore` and a server snapshot; the
  workspace builds in dependency order (core, vanilla, react); the root tsconfig maps both package
  names to their source and sets `"jsx": "react-jsx"`; Vitest and the site resolve the package
  names to source (the site's own alias comes with L5.6, its first import by name); dev dependencies `react`, `react-dom`, their types, `@testing-library/react`
  and `@testing-library/dom`; ARCHITECTURE says "hooks".
- **Out of scope:** dragging (L5.4); the README (L5.7).
- **Contract:** none. **Public API:** `useBoard` (new package).
- **Acceptance criteria:**
  1. A component using `useBoard` renders the lists and cards and re-renders after each change.
  2. Between changes the Snapshot is the same object (no extra render); a server render returns the
     current Snapshot.
  3. `npm ci && npm run verify` passes in a clean clone (the build order and the source aliases).
- **Files:** ~12: `packages/react` (package.json, tsconfig, LICENSE, `src/index.ts`,
  `src/use-board.ts`, a test), the root package.json, tsconfig and Vitest config, the lockfile,
  ARCHITECTURE, PLAN, STATE.
- **References:** DEC-09, DEC-12, DEC-18.

### L5.4 · Drag and keyboard in React
- **Status:** done (2026-11-25)
- **Goal:** a React board moves cards and lists by pointer and keyboard.
- **Depends on:** L5.3.
- **In scope:** `useListPicker(board, options)`: a callback ref for the root and getters for a
  list, its handle, its cards' container and a card (the `data-lp-*` attributes, focusability);
  in `useEffect`, it starts the engine with `moveElements: false` when the root mounts and
  destroys it when the root unmounts or changes; React Testing Library tests (with `cleanup()`).
- **Out of scope:** options kept current, `StrictMode` (L5.5); the demo (L5.6).
- **Contract:** none. **Public API:** `useListPicker` and its getter types.
- **Acceptance criteria:**
  1. A drop and a keyboard step change the Board and React draws the move, across lists, with no
     error.
  2. Unmounting removes every listener the engine added.
- **Files:** ~5: `src/use-list-picker.ts`, `src/index.ts`, a test, PLAN, STATE.
- **References:** DEC-13, DEC-15, DEC-18.

### L5.5 · Current options and StrictMode
- **Status:** done (2026-11-25)
- **Goal:** the React hook behaves like a React hook: options follow renders, `StrictMode` is safe.
- **Depends on:** L5.4.
- **In scope:** `messages`, `canMove` and `onActivate` are read from the latest render without
  restarting the engine, and without writing a ref during render (L5.4 does, for the start only;
  React's rules forbid it); adding or removing `onActivate` or `canMove` restarts it (the engine
  decides at creation whether activation exists, and Enter must not be taken from a card that is a
  link or a button without one); `StrictMode`'s double mount leaves one engine; React 18.3 checked
  once.
- **Out of scope:** the demo.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. A changed `canMove` or `onActivate` applies at the next move or activation.
  2. Without `onActivate`, Enter on a card reaches the card's own handler.
  3. Under `StrictMode`, one engine runs (one Clone, one announcement per move).
- **Files:** ~4: `src/use-list-picker.ts`, a test, PLAN, STATE.
- **References:** DEC-16, DEC-17, DEC-18.

### L5.6 · The React demo
- **Status:** done (2026-11-25)
- **Goal:** the kanban demo, written in React, on the site.
- **Depends on:** L5.5.
- **In scope:** a React page with the kanban board (the same lists, the skins and styles reused from
  `playground/demo.css` and `site/home.css`, a capped list, activation), built into the site and
  listed in the nav's Demos on every page; browser tests: a drag across lists, a keyboard move,
  `StrictMode`.
- **Out of scope:** the vanilla demo's editing panels.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. In Chrome, a card dragged to another list and a card moved by keyboard land where they were
     put, with no page error.
  2. Every page's nav and the home link the React demo.
- **Files:** ~12: the demo's page and script, the site build, the nav on five pages, the nav sweep
  and a new e2e test, PLAN, STATE.
- **References:** L4.17, L4.18.

### L5.7 · The React README and its page
- **Status:** done (2026-11-25)
- **Goal:** someone can learn the React adapter from its README, on npm and on the site.
- **Depends on:** L5.6.
- **In scope:** `packages/react/README.md` (install, a complete example, the hooks, the styling
  hooks shared with vanilla, local state lost by a card moved across lists); `site/react.html`
  rendered from it, linked in the nav's Docs on every page and in the home's table; `npm run
  packed` packs react too, installs `react` and `react-dom`, and builds its `tsx` example.
- **Out of scope:** the publish (L5.8).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The README's example type-checks against the packed packages and draws a working board.
  2. The site has a React page with a section index, linked from every page.
- **Files:** ~11: the README, `site/react.html`, the nav on six pages, `scripts/check-packed.ts`,
  PLAN, STATE.
- **References:** L4.5, L4.14, M4 retro (packed packages).

### L5.8 · First publish of the React adapter
- **Status:** next
- **Goal:** `@list-picker/react` is on npm.
- **Depends on:** L5.7.
- **In scope:** a last `npm publish --dry-run`; the owner publishes `@list-picker/vanilla` 1.1.0,
  then, once the registry shows it (about two minutes), `@list-picker/react` 1.0.0 (`--otp`); the
  agent tags `vanilla-v1.1.0` and `react-v1.0.0` and checks the install from the registry; the
  home's Install chooser shows the React command.
- **Out of scope:** a release workflow in CI.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. `npm install @list-picker/react` in an empty folder installs it with core and vanilla 1.1.0,
     and the README example runs against them.
  2. The tags point at the published commits.
- **Files:** ~3: `site/index.html`, PLAN, STATE.
- **References:** L4.26, GOTCHAS (Publishing).

### L5.9 · One nav, one Demos link
- **Status:** done (2026-11-25)
- **Goal:** the nav is written once, and its Demos are one link, so it fits on a phone and grows
  without touching every page.
- **Depends on:** L5.8 (owner, 2026-11-25: the demos page, the demos' code and saving the order
  before React's launch).
- **In scope:** a `<!-- nav -->` marker the site build replaces with the one nav (`site/partials/nav.html` (a subdirectory: every `.html` in `site/` is a page)), on
  every page, the playground's demo too; its Demos are one link, `demos`, to the Board in vanilla;
  the nav sweep (320–1400px) on every page.
- **Out of scope:** the demos switcher (L5.10).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Every page shows the same nav, built from one file, with no sideways scroll from 320 to 1400px.
  2. The nav's `demos` opens the vanilla Board; the current page's link is marked
     (`aria-current="page"`).
- **Files:** ~12: `site/partials/nav.html` (a subdirectory: every `.html` in `site/` is a page), the site build, the pages' nav, the e2e sweep, PLAN, STATE.
- **References:** L4.17, L5.6.

### L5.10 · The demos switcher
- **Status:** done (2026-11-25)
- **Goal:** one place for the demos: each demo, Board or Player, in each framework.
- **Depends on:** L5.9.
- **In scope:** a switcher on every demo page: the demo (Board, Player) and the framework (Vanilla,
  React; Angular shown as "soon", not a link), each a link with `aria-current`, its demos in a
  table in the site build (the React Player comes with L5.11: its switch shows "soon" until then);
  the pages keep their addresses (`demo/`, `react-demo.html`, `player.html`; renaming them would
  be a page rewritten twice in the size check, for an address nobody reads).
- **Out of scope:** the React Player (L5.11); the demos' code (L5.15).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. From any demo page, the switcher reaches every other demo page there is, keeping the demo or
     the framework chosen.
- **Files:** ~11: the switcher (built by the site build, its style), the three pages, the e2e
  tests, PLAN, STATE.
- **References:** L4.18 (the player), L5.6.

### L5.11 · The React Player
- **Status:** done (2026-11-25)
- **Goal:** the Player demo, written in React, with `@list-picker/react`.
- **Depends on:** L5.10.
- **In scope:** `player-react.html` with the same playlist, look and behaviour as the vanilla Player
  (reorder by pointer and keyboard, play a track by click or Enter, the equalizer), its style
  reused from `player.css`; its switch in the switcher; a browser test (a drag and a keyboard move).
- **Out of scope:** saving the order (L5.13).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. In Chrome, a track dragged and a track moved by keyboard land where they were put, and Enter
     plays the focused track, with no page error.
- **Files:** ~6: the page and its script, the switcher, an e2e test, PLAN, STATE.
- **References:** L4.18, L5.6.

### L5.12 · The vanilla Board page
- **Status:** done (2026-11-25)
- **Goal:** the vanilla Board demo is a small page, the twin of the React one, so saving the order
  (L5.13) and the code shown (L5.15) stay readable; the playground stays a developer's page.
- **Depends on:** L5.11.
- **In scope:** `site/board.html` and `board.ts`: the home's board drawn by `mount` in the React
  demo's markup (skins, Doing capped at 3, a click or Enter opens); the switcher's vanilla Board and
  the nav's `demos` link to it; the Board suite (`e2e/react.e2e.ts`) runs on both pages; the
  playground (`demo/`, the drag tests' page) leaves the switcher, is titled "Playground" and is
  linked from the home.
- **Out of scope:** saving the order (L5.13).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. In Chrome, the vanilla Board passes the React Board's suite (a drag across lists, a keyboard
     move refused by the cap, one live region, Enter opens).
  2. The switcher and the nav reach it; the playground keeps its drag tests, outside the switcher.
- **Files:** ~13: the page and its script, the switcher's table, the nav, the demo pages' markers,
  the playground, the home, the e2e tests, PLAN, STATE.
- **References:** L5.6, L5.10.

### L5.13 · Saving the order: the vanilla Board
- **Status:** planned
- **Goal:** the Board demo shows how an app saves the order: it loads from a backend and saves
  every move, so a reload keeps the order.
- **Depends on:** L5.12.
- **In scope:** a simulated backend in the site (`site/fake-server.ts`, shared by the demos): it keeps
  the board in `localStorage`, answers after a delay, and fails on demand; the vanilla Board (`board.ts`) loads
  its lists and cards from it on open, sends each `move` event (DEC-11: `id`, `toListId`, `prevId`,
  `nextId`) as a request and shows the move at once; when a request fails, it draws the server's
  order again and says so; a panel lists the requests and their answers, with "fail the next
  request" and "reset the data"; a "Saving the order" section in vanilla's README (the pattern:
  load, save from `move`, undo on a failure).
- **Out of scope:** the React Board (L5.14); the Player; a real backend; ranks (Later).
- **Contract:** none. **Public API:** none (README only; npm shows it from vanilla's next version).
- **Acceptance criteria:**
  1. A card moved, then the page reloaded, is where it was put.
  2. With "fail the next request", a move is shown, then undone with a notice; the panel shows the
     failed request.
  3. "Reset the data" brings back the starting board.
- **Files:** ~8: the fake server, the Board demo's script and page, its style, vanilla's README, an
  e2e test, PLAN, STATE.
- **References:** DEC-11; the `move` event (L1.9).

### L5.14 · Saving the order: the React Board
- **Status:** planned
- **Goal:** the same as L5.13, written with `@list-picker/react`.
- **Depends on:** L5.13.
- **In scope:** the React Board loads from the fake server, saves each `move`, draws the server's
  order again on a failure and shows the same panel; a "Saving the order" section in React's
  README.
- **Out of scope:** a data-fetching library.
- **Contract:** none. **Public API:** none (README only).
- **Acceptance criteria:** those of L5.13, on the React Board.
- **Files:** ~6: the React Board's script and page, React's README, an e2e test, PLAN, STATE.
- **References:** L5.13.

### L5.15 · The demos' code
- **Status:** planned
- **Goal:** each demo page shows the code that runs it, so a reader sees how to build their own.
- **Depends on:** L5.14.
- **In scope:** below each demo, its source files (script, markup, style; the fake server on the
  Boards) in tabs, read from the files themselves at build time and highlighted then (Shiki, a dev
  dependency of the site: no script in the page for it), each with a copy button.
- **Out of scope:** an editable playground (StackBlitz and the like).
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. Each demo page shows its files, the same text as in the repository (a test compares one).
  2. The copy button copies a file's text; the page has no sideways scroll at 320px.
- **Files:** ~8: the build, the code block's style and script, the four pages, an e2e test, PLAN,
  STATE.
- **References:** L4.12 (the build), the install's copy button.

## Later
Ideas not planned yet; a milestone's planning picks from here.
- Click to select several cards, then click a target List to move them all (from list-picker-js).
- A "keep original order" mode: a card returning to a List goes back to its original position
  (list-picker-js `order`).
- A grab-side state attribute so the user can tilt the Clone (list-picker-js).
- Fractional ranks (LexoRank-like) computed from a move event, as a helper for persistence.
- Virtualised Lists for very long boards.
- `addList` and `addCard` generating the id when the value has none (`crypto.randomUUID()`), and
  returning it; additive, for prototypes without a backend (owner, 2026-11-23).
- `mount` keeps the focus and keyboard grab of a card its writes move (Chrome blurs it; L4.2).
- Esc during a drag also reaches the page's other Esc handlers (a dialog around the board would
  close too); stopping it needs a capture-phase listener (L2.5 review).
