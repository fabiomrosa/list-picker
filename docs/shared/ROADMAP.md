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

## M0 · Foundations
The npm workspace with `packages/core` empty, TypeScript strict, format, lint, tests with coverage,
build, and the gate in CI.

| Repository | Slices |
|---|---|
| `list-picker` | L0.1 runnable skeleton |

## Prerequisites (only the owner can do these)
- **P1** · The GitHub repository `list-picker`, `main` pushed, labels and squash settings
  (OWNER_PLAN §0). Needed by L0.1 (its pull request).
- **P2** · The npm account and package names (DEC-12). Needed by the first publish (M4).

## Later milestones (split when they start)
- **M1 · Core model.** No DOM. The doubly linked list with its Index (append, insert before/after,
  remove, get, iterate), the Board as a list of Lists, Move within and across Lists and Move of a
  List, the event emitter and the move event, the Snapshot. Property tests of the PRODUCT
  invariants. A benchmark against an array implementation.
- **M2 · Drag engine.** Pointer down and threshold, the Clone moved with `transform` in
  `requestAnimationFrame`, the Placeholder before/after the card under the pointer or at the end,
  drop into `core` Move, Esc to cancel, auto-scroll at the edges, dragging Lists. Browser tests.
- **M3 · Vanilla adapter and demo.** Mount a Board into a container with the user's Renderers,
  update on core events, destroy (every listener removed). The demo board, and a trace that shows no
  forced layout per pointer move.
- **M4 · v1 release.** Keyboard dragging and ARIA live announcements, the docs, the lab write-up,
  the first npm publish.
- **M5 · React adapter.** **M6 · Angular adapter.**

## Recommended order (one session at a time)
L0.1, then plan M1 with the owner ("plan M1").

## Open decisions (see DECISIONS.md)
| Id | Question | Status | Needed by |
|---|---|---|---|
| – | None open | – | – |
