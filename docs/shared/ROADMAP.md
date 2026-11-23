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

## M2 · Drag engine
`@list-picker/vanilla`'s drag engine over the user's markup (DEC-10, DEC-13): pointer down and
threshold, the Clone moved with `transform` in `requestAnimationFrame`, the Placeholder before or
after the card under the pointer or at the end of a list, drop into `Board.moveCard`, Esc and
`pointercancel` to cancel, browser tests, auto-scroll at the edges, dragging lists. The playground
becomes draggable at L2.4.

| Repository | Slices |
|---|---|
| `list-picker` | L2.1 → L2.2 → L2.3 → L2.4 → L2.5 → L2.6 → L2.7 → L2.8 |

## Prerequisites (only the owner can do these)
- **P1** · The GitHub repository `list-picker`, `main` pushed, labels and squash settings
  (OWNER_PLAN §0). Done.
- **P2** · The npm account and package names (DEC-12). Needed by the first publish (M4).

## Later milestones (split when they start)
- **M3 · Vanilla adapter and demo.** Mount a Board into a container with the user's Renderers,
  update on core events, destroy (every listener removed). The playground becomes the demo board,
  and a trace shows no forced layout per pointer move.
- **M4 · v1 release.** Keyboard dragging and ARIA live announcements, the docs, the lab write-up,
  the first npm publish.
- **M5 · React adapter.** **M6 · Angular adapter.**

## Recommended order (one session at a time)
L2.1 to L2.8 in order; the owner checks the drag in the browser after L2.4 and at the end of M2.

## Open decisions (see DECISIONS.md)
| Id | Question | Status | Needed by |
|---|---|---|---|
| DEC-13 | The engine finds elements by data attributes and applies drops itself | Proposed | L2.1 |
