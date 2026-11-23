# 0002 · No forced layout per pointer move: a trace of real drags

- **Status:** Accepted (2026-11-23). It records a measurement; the engine is unchanged.

## Context
AGENTS forbids a layout read after a write in the same `pointermove` frame, and DEC-08 keeps the
Clone on `transform` inside `requestAnimationFrame`. Decision 0001 found the model's cost tiny next
to layout, so the claim that a drag forces no layout is the one that matters, and PRODUCT asks for
it to be measured.

## Method
`npm run trace` (`bench/drag-trace.ts`) serves the demo board with Vite, opens it in the installed
Chrome (Playwright, headless, 1100×900, with real scrollbars as in the browser tests), and records
a `devtools.timeline` trace of five drags, each 60 pointer steps: a card within a list, a card into
another list, a card into an empty list, a card to the bottom of the tall Backlog list resting
1.5 s near its edge (auto-scroll), and a list by its handle.

A layout (`Layout`) or style recalculation (`UpdateLayoutTree`) on the renderer's main thread that
falls inside a JavaScript task was forced by that script: the page asked for geometry while it was
dirty. The script counts them inside each `pointermove` dispatch (`EventDispatch`) and inside each
animation-frame callback (`FireAnimationFrame`); layouts in the normal rendering pipeline are not
forced and are only totalled. The script fails if it finds no `pointermove` dispatch or no animation
frame, so a wrong thread cannot read as zero. Call sites were read once by adding the
`disabled-by-default-devtools.timeline.stack` category (not part of `npm run trace`). A review pass
also classified every layout by all its JavaScript ancestors (pointer events of any type, timers,
microtasks such as `mount`'s reconcile): none was forced outside animation frames.

Not covered: horizontal auto-scroll and window scrolling (the script sets the board's
`scrollLeft` itself).

Machine: Apple M4 Pro, 24 GB, macOS 27.0.1, Node 26.13.1, Chrome 157.0.8103.79.

## Results
Three runs, identical but for the dispatch count (one `pointermove` per run is traced as an
instant event and not counted):

| Inside | Count | Forced layouts | Forced style recalcs |
|---|---|---|---|
| `pointermove` dispatch | 333 – 335 | 0 | 0 |
| animation-frame callback | 374 | 12 | 34 |

All layouts on the main thread: 26 per run.

- **`pointermove`: zero.** The handlers only store the pointer; the drag start reads the item's box
  before it writes.
- **Animation frames: 10 of the 12 layouts and 28 of the 34 style recalcs come from auto-scroll**:
  `update` moves the Placeholder, then writes `scrollTop`, and a scroll offset needs a fresh layout.
  Writing the scroll first removes them (measured: 1 layout, 6 recalcs) but breaks upward
  auto-scroll: the Placeholder then moves above the scroll anchor after the write, and scroll
  anchoring pushes the list back by one card every ~10 frames (measured `scrollTop` deltas: −15 per
  frame, then +71). The write after `place()` overrides that adjustment, so the order stays.
- **The other 2 layouts and 6 recalcs are the first frame's first read** (`elementFromPoint`): the
  drag start writes the Clone and the Placeholder in `pointermove`, and when no rendering happened
  before the frame, that read lays out. Observed on some drag starts, never more than once per drag.

## Decision
Keep the engine as it is: the claim (no forced layout per pointer move) holds. Auto-scroll costs one
forced layout per frame while it runs, by design of the frame order above.

## Consequences
- The claim holds and is now measured: no forced layout per pointer move.
- One forced layout per auto-scroll frame remains; avoiding it would need scroll anchoring turned
  off on the user's containers during a drag (an inline style DEC-07 avoids), not worth it unless a
  trace of a heavy board shows the cost.
- Repeat it with `npm run trace` after changing the engine's frame loop; it is not part of the gate
  (a trace is slow and its counts depend on the browser).
- GOTCHAS records the scroll-write order and scroll anchoring.
