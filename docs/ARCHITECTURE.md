# list-picker architecture

A layered library in one npm workspace: a pure model at the bottom, a DOM drag engine on top of it,
and thin adapters on top of both. Behaviour is written and tested once, in the lower layers;
adapters only bind it to a UI layer (DEC-09, DEC-12).

## Stack
Exact versions are pinned in the root `package.json`.
- **Language:** TypeScript 7, `strict` plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, ES modules (`nodenext`), target ES2024. Node 26 (npm 11).
- **Workspace:** npm workspaces, packages under `packages/`. The root `tsconfig.json` type-checks
  every package's `src` and `test`; each package's `tsconfig.json` extends it to build its `src`.
- **Tests:** Vitest 5 with V8 coverage; `fast-check` 4 for property tests of the model invariants
  against a plain array model; `happy-dom` for engine unit tests; Playwright (`@playwright/test`)
  for real drags in the installed Chrome (`channel: "chrome"`, nothing downloaded), against the
  playground on port 5180.
- **Format and lint:** Biome 2.
- **Build:** `tsc` per package, to ESM plus type declarations in `dist/`.
- **Playground:** Vite (dev server only), from L1.1.

## Modules

| Package | Owns | May depend on |
|---|---|---|
| `packages/core` | The doubly linked list and its Index, the Board, Move, the event emitter, the Snapshot. No DOM. | nothing |
| `packages/vanilla` | The drag engine over the user's markup (`createDrag`, M2: pointer handling, Clone, Placeholder, hit-testing, auto-scroll; DEC-13) and the vanilla mount (`mount`, M3: containers, the user's Renderers, updates by id; DEC-14) | `core` |
| `playground/` (L1.1) | A local page that draws the model and exercises it by hand; not a package, never published | `core` (source) |
| `packages/react` (M5) | Hook and components over `core` and the engine | `core`, `vanilla`'s engine |
| `packages/angular` (M6) | Directive and components over `core` and the engine | `core`, `vanilla`'s engine |

Each package is created by the first slice that needs it. If the engine must be shared by the
framework adapters without the vanilla mount, it splits into its own package then, not before.

### The model (`core`)
- `LinkedList<T extends { id: string }>`: `first`, `last`, `size`, and an Index
  `Map<id, Node<T>>`. `get(id)`, `has(id)`, `insertBefore(value, beforeId | null)` (`null` appends,
  like the DOM's `insertBefore`), `remove(id)`, iteration in order. All O(1) except iteration.
- `Board`: a `LinkedList<List>`; each `List` holds a `LinkedList<Card>`. A card-to-list map gives
  the List of any card in O(1). The indexes key on `id` at insertion, so a value's `id` must not
  change while it is on the Board.
- `moveCard(id, toListId, beforeCardId | null)` and `moveList(id, beforeListId | null)`: remove
  from one linked list and insert into another (or the same), update the card-to-list map, emit one
  `move` event. A drop always knows the card below it, so `before` is the only position needed.
- `snapshot()`: an immutable array view, in order, for renderers that need arrays.

## Request flow
The flow of one drag (DEC-08):
1. `pointerdown` on a card: remember the card and the pointer; nothing visible yet.
2. Past the threshold: read the card's rect once, create the Clone (fixed position, moved by
   `transform`), put a Placeholder of the same size where the card was, and hide the card.
3. `pointermove`: store the pointer; one `requestAnimationFrame` per frame moves the Clone and finds
   the Drop target: the List under the pointer, then the card under the pointer, compared with its
   vertical middle: above → Placeholder before it, below → after it; past the last card or in an
   empty List → at the end. The Placeholder moves only when its target changes.
4. `pointerup`: if the position changed, `core` moves the node and emits the move event; the card
   takes the Placeholder's place. Esc or `pointercancel`: put everything back, emit nothing.
5. Remove the Clone, the Placeholder and the drag-only listeners.

## Persistence
None. The library holds the order in memory and reports changes through events; the user persists.

## Configuration
Options passed to the constructor or the adapter; no environment. An invalid option (a missing
container, a duplicate `id`) throws an `Error` with a plain message at mount, never fails silently.

## Security
The user's data never goes through `innerHTML`; Renderers return elements. No network access.

## External providers
None. GitHub for the code and CI; npm for publishing (from M4).

## Design references
None: the library is headless (DEC-07). The demo's look lives in the demo only.

## Lessons from list-picker-js (2017)
The old library (`../list-picker-js`) was a two-way transfer list (options and picks), not a board.
What it got right and returns here:
- Two modes of moving: drag, and click to select several cards then click a target List. The second
  is the base for keyboard and accessible moving (M4).
- The Clone tilts toward the side the card was grabbed from: a good touch, exposed here as a state
  attribute (e.g. `data-grab="left"`) the user styles, not as a built-in style.
- A method to read the result (`getPicks`): here the Snapshot and the move events.
- Plain error messages on bad setup.

What it got wrong and this design avoids:
- Every card positioned absolutely, with `top` and the list height recomputed in JavaScript after
  each change, and `setTimeout(…, 1)` to wait for the DOM: here the flow does the layout (DEC-08).
- `getBoundingClientRect` and `offset*` read on every `mousemove`: forced layout each event.
- `mousemove`/`mouseup` added to `window` once per List and never removed: the handler ran N times
  per event, and re-creating the picker leaked every old instance. Here listeners exist only during
  a Drag and `destroy()` removes them.
- Mouse events only (no touch), hit-testing by horizontal position only, no reordering inside the
  same List while dragging.
- `innerHTML` with the user's template string; a fixed markup with required classes.
