# list-picker gotchas

Non-obvious facts about this exact stack and machine. Read the section for what you are touching
before you start; it saves hours. Add new ones as you learn them (SESSION §3.7). Facts, not rules.

## Toolchain
Node 26 and npm 11 locally (pnpm is installed too, but the workspace uses npm).

## DOM and drag
- Reading layout (`getBoundingClientRect`, `offsetTop`, `offsetHeight`) right after a DOM write
  forces a synchronous layout. In a `pointermove` loop that is the main cost of a board, far more
  than any list operation.
- Without `touch-action: none` on the draggable element, a touch drag scrolls the page and fires
  `pointercancel`.
- `setPointerCapture` keeps `pointermove` coming when the pointer leaves the card; without it, a
  fast move loses the drag.
- `elementFromPoint` returns the Clone itself unless the Clone has `pointer-events: none`.
