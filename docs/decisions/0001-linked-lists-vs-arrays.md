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

Each sample builds a fresh board outside the timing; 5 warm-up samples, then the median of 30.
`bench/array-board.test.ts` (in the gate) checks both boards give the same results and the same
order after the same moves, so they do the same work.

Machine: Apple M4 Pro, 24 GB, macOS 27.0.1, Node 26.13.1. Three runs:

| Board (lists × cards per list) | Linked list (µs/move) | Arrays (µs/move) | Arrays / linked |
|---|---|---|---|
| 10 × 10 | 0.135 – 0.149 | 0.128 – 0.133 | 0.9× |
| 10 × 100 | 0.152 – 0.171 | 0.396 – 0.409 | 2.4 – 2.7× |
| 20 × 500 | 0.185 – 0.187 | 1.42 – 1.50 | 7.7 – 8.1× |

## Decision
Keep the linked-list model (DEC-06). A move costs the same, about 0.15–0.19 µs, whatever the list
length, as O(1) predicts; the array board grows with the list length (`findIndex` and `splice`): even
at 10 cards per list, 2.4–2.7× slower at 100, about 8× at 500.

## Consequences
- The theory holds for the model, but the absolute numbers are tiny: even the slowest case is
  1.5 µs per move, and a drag makes one move per drop. For a UI the cost that matters is layout and
  rendering (M2, M3), not the model; the linked list's other gains are the API (neighbours, which
  map onto DEC-11's events) and the invariants it makes explicit.
- The gap matters for long lists and bulk work (replaying many moves from a server, scripted
  reorders).
- Not measured: memory per card, `snapshot()` (O(n) after each change; M3 measures it in real
  renders if it shows up in a trace).
