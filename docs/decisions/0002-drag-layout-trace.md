# 0002 · No forced layout per pointer move: a trace of real drags

- **Status:** Accepted (2026-11-23). It records a measurement; the engine's frame order changed
  with it (scrolling before the other writes).

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
forced and are only totalled. Stacks were read once with `disabled-by-default-devtools.timeline.stack`
to find the call sites.

Machine: Apple M4 Pro, 24 GB, macOS 27.0.1, Node 26.13.1, Chrome 157.0.8103.79.

## Results
Three runs after the change, identical but for the dispatch count:

| Inside | Count | Forced layouts | Forced style recalcs |
|---|---|---|---|
| `pointermove` dispatch | 333 – 335 | 0 | 0 |
| animation-frame callback | 374 | 1 | 6 |

All layouts on the main thread: 26 per run.

- **`pointermove`: zero.** The handlers only store the pointer; the drag start reads the item's box
  before it writes.
- **Before the change, animation frames forced 12 layouts and 34 style recalcs** (two runs). Ten of
  the layouts came from auto-scroll: `update` moved the Placeholder, then set `scrollTop`, and a
  scroll offset needs a fresh layout. Scrolling now comes first, while layout is still clean. The
  total of 26 layouts did not change: the same work now runs in the rendering pipeline.
- **The one left** is the first frame of a drag: the start writes the Clone and the Placeholder in
  `pointermove` (after its reads), and the frame's first read (`elementFromPoint`) lays out before
  the browser has rendered. One per drag start at most, not per move; removing it would mean
  deferring the start's writes to the frame, which is not worth it.

## Consequences
- The claim holds and is now measured: no forced layout per pointer move.
- Repeat it with `npm run trace` after changing the engine's frame loop; it is not part of the gate
  (a trace is slow and its counts depend on the browser).
- GOTCHAS records that writing a scroll offset forces layout.
