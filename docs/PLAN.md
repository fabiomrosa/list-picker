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
styles the user must fight, except the Clone's position and `transform`.

### L2.1 · Vanilla package and drag start
- **Status:** next
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
- **Status:** waiting (L2.1)
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
- **Status:** waiting (L2.2)
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
- **Status:** waiting (L2.3)
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
- **Status:** waiting (L2.4)
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
- **Status:** waiting (L2.5)
- **Goal:** real drags in a real browser are checked by the gate.
- **Depends on:** L2.5.
- **In scope:** `@playwright/test` with the installed Chrome (`channel: "chrome"`; GitHub's Ubuntu
  runner has it, so nothing is downloaded); its web server runs the playground; `e2e/drag.spec.ts`:
  drag a card within a list, across lists, into an empty list; a click without moving changes
  nothing. Added to `npm run verify`.
- **Out of scope:** other browsers.
- **Contract:** none. **Public API:** none.
- **Acceptance criteria:**
  1. The four scenarios pass locally and in CI.
  2. One fails when the drop is broken on purpose (seen once).
- **Files:** ~7: `playwright.config.ts`, `e2e/drag.spec.ts`, root `package.json`, lockfile, `ci.yml`,
  `.gitignore`, ARCHITECTURE "Stack", PLAN, STATE.
- **References:** CONVENTIONS §5.

### L2.7 · Auto-scroll
- **Status:** waiting (L2.6)
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
- **Files:** ~6: `src/drag.ts` (or `src/auto-scroll.ts`), tests, `e2e/drag.spec.ts`, playground,
  PLAN, STATE.
- **References:** DEC-08.

### L2.8 · Drag lists
- **Status:** waiting (L2.7)
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
- **Files:** ~6: `src/drag.ts`, its test, `e2e/drag.spec.ts`, playground, PLAN, STATE.
- **References:** DEC-13.

## Later
Ideas not planned yet; a milestone's planning picks from here.
- Click to select several cards, then click a target List to move them all (from list-picker-js).
- A "keep original order" mode: a card returning to a List goes back to its original position
  (list-picker-js `order`).
- A grab-side state attribute so the user can tilt the Clone (list-picker-js).
- Fractional ranks (LexoRank-like) computed from a move event, as a helper for persistence.
- Virtualised Lists for very long boards.
