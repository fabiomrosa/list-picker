# Roadmap

## The end goal
v1 is a published vanilla library and a demo board: `core` with the linked-list model, the drag
engine with Clone and Placeholder, the vanilla adapter, and a written answer to the lab's question
(do linked lists make the board simpler and faster than arrays?), backed by a benchmark. React and
Angular adapters follow v1.

## How to use this plan
- `docs/PLAN.md` holds the full entries of the slices and their status. Slice ids start with the
  repository's prefix: `L` (list-picker). This file is the map, the prerequisites and the order.
- Only the current milestones have slices. A later milestone is split into slices with the owner
  before its first slice starts: ordered by feature, with its prerequisites, and every entry with its
  expected files.
- A slice is one session and one small pull request (SESSION §0).
- The plan changes only with the owner, through a docs pull request.
- A milestone is planned before its first slice and closed after its last (SESSION §7); its heading
  then reads `M<n> · Name · done (YYYY-MM-DD)`.

## M0 · Foundations · done (2026-11-22)
The npm workspace with `packages/core` empty, TypeScript strict, format, lint, tests with coverage,
build, and the gate in CI.

| Repository | Slices |
|---|---|
| `list-picker` | L0.1 runnable skeleton |

## M1 · Core model · done (2026-11-22)
The doubly linked list with its Index, the Board, moves, events, the Snapshot, property tests of the
PRODUCT invariants, and a benchmark against arrays. No DOM in `core`; a local playground page draws
the model and grows with every slice; the owner checks it in the browser at the end of M1.

| Repository | Slices |
|---|---|
| `list-picker` | L1.1 → L1.2 → L1.3 → (L1.4 ∥ L1.5 → L1.6 → L1.7) → L1.8 → L1.9 → L1.10 → L1.11 |

## M2 · Drag engine · done (2026-11-23)
`@list-picker/vanilla`'s drag engine over the user's markup (DEC-10, DEC-13): pointer down and
threshold, the Clone moved with `transform` in `requestAnimationFrame`, the Placeholder before or
after the card under the pointer or at the end of a list, drop into `Board.moveCard`, Esc and
`pointercancel` to cancel, browser tests, auto-scroll at the edges, dragging lists. The playground
becomes draggable at L2.4.

| Repository | Slices |
|---|---|
| `list-picker` | L2.1 → L2.2 → L2.3 → L2.4 → L2.5 → L2.6 → L2.7 → L2.8 |

## M3 · Vanilla adapter and demo · done (2026-11-23)
`mount(root, board, { renderList, renderCard })` draws a Board from the user's Renderers into the
DEC-13 containers, starts the drag engine and follows Board changes by id (DEC-14); the playground
becomes the demo board; a recorded trace shows no forced layout per pointer move (decision 0002).

| Repository | Slices |
|---|---|
| `list-picker` | L3.1 → L3.2 → L3.3 → L3.4 |

## M4 · v1 release
Keyboard moving for cards and lists (DEC-15), live announcements with overridable English defaults
(DEC-16), the two M3 known issues fixed, a README per package, the lab write-up in the root README,
the rest of the v1 API (DEC-17: changing values, activating, move rules), the site with docs, the
demo and a live board on the home, and the first npm publish.

| Repository | Slices |
|---|---|
| `list-picker` | L4.1 → L4.2 → L4.3 → L4.4 → L4.5 → L4.6 → L4.7 → L4.8 → L4.9 → L4.10 → L4.11 → L4.12 → L4.13 → L4.14 → L4.15 → L4.16 → L4.17 → L4.18 → L4.19 → L4.20 → L4.21 → L4.22 |

## Prerequisites (only the owner can do these)
- **P1** · The GitHub repository `list-picker`, `main` pushed, labels and squash settings
  (OWNER_PLAN §0). Done.
- **P2** · The npm account and package names (DEC-12). Done: `@list-picker/core` and
  `@list-picker/vanilla` (the owner's `list-picker` npm org), to be published from the owner's
  account in L4.22.
- **P3** · The license of the packages. Done: MIT (left to the agent by the owner, 2026-11-23).
- **P4** · GitHub Pages turned on for the repository (Settings → Pages → Source: GitHub Actions).
  Needed by L4.12.

## Later milestones (split when they start)
- **M5 · React adapter.** **M6 · Angular adapter.**

## Recommended order (one session at a time)
L4.1 to L4.22 in order; P3 before L4.5, GitHub Pages turned on before L4.12, P2 before L4.22.

## Open decisions (see DECISIONS.md)
| Id | Question | Status | Needed by |
|---|---|---|---|
| – | None open | – | – |
