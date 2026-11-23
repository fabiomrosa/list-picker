# 0001 · Linked lists against arrays for the board model

- **Status:** Accepted (2026-11-22). It records a measurement; DEC-06 stands.

## Context
DEC-06 chose doubly linked lists with an id index for the Board, on the theory that a move is then a
few pointer changes instead of index arithmetic and array shifting. PRODUCT asks that performance
claims be measured. L1.11 measures the model only; DOM and layout cost belong to M3.

## Method
`npm run bench` (`bench/run.ts`) times the same 2000 seeded random card moves (within and across
lists, before a random card or to the end) on:
- the `Board` from `@list-picker/core`: linked lists, the card-to-list index, validation, events
  (no listeners) and Snapshot invalidation, as shipped;
- `ArrayBoard` (`bench/array-board.ts`): plain arrays with `findIndex` + `splice`, and a
  card-to-list map so finding a card's list is O(1) too. The cost left is the work inside a list.

Each sample builds a fresh board outside the timing. Both sides warm up for about 100 ms, then 40
rounds alternate which side runs first; the result is the median. A plain Node runner rather than
`vitest bench`, because every sample needs a fresh board built outside the timing.
`bench/array-board.test.ts` (in the gate) checks, for all three shapes, that both boards return the
same results (including no-op moves) and end in the same order, so they do the same work.

Machine: Apple M4 Pro, 24 GB, macOS 27.0.1, Node 26.13.1. Ids are short strings; no listeners.
Three runs:

| Board (lists × cards per list) | Linked list (µs/move) | Arrays (µs/move) | Arrays / linked |
|---|---|---|---|
| 10 × 10 | 0.097 – 0.105 | 0.121 – 0.122 | 1.1 – 1.3× |
| 10 × 100 | 0.139 – 0.150 | 0.399 – 0.419 | 2.8 – 2.9× |
| 20 × 500 | 0.180 – 0.183 | 1.44 – 1.48 | 7.9 – 8.2× |

A first version of the runner warmed up for only 5 short samples and always ran the linked list
first; it measured 10 × 10 the other way round (arrays 10% faster) and the linked list up to 20%
slower at 20 × 500. Small differences here depend on the method: read the 10 × 10 row as "about
equal".

## Decision
Keep the linked-list model (DEC-06). From 10 to 500 cards per list (50× longer), a linked-list
move gets about 1.8× slower (likely memory and cache effects; the work itself is O(1)), while an
array move gets about 12× slower (`findIndex` and `splice` are O(n)). About equal on small lists,
roughly 3× faster at 100 cards per list and 8× at 500.

## Consequences
- The theory holds for the model, but the absolute numbers are tiny: even the slowest case is
  1.5 µs per move, and a drag makes one move per drop. For a UI the cost that matters is layout and
  rendering (M2, M3), not the model; the linked list's other gains are the API (neighbours, which
  map onto DEC-11's events) and the invariants it makes explicit.
- The gap matters for long lists and bulk work (replaying many moves from a server, scripted
  reorders).
- Not measured: memory per card, `snapshot()` (O(n) after each change; M3 measures it in real
  renders if it shows up in a trace), other machines and engines, long ids.
