# list-picker conventions

The exact shape of the code. Match it exactly; when something is not covered here, follow the nearest
existing code and propose an addition to this file in the pull request.

Rules are checked by the review (`list-picker-code-review`) unless tagged with the check that enforces
them (**[lint]**, **[test]**). A rule gets a mechanical check only when a real mistake shows it is
needed (DEC-03).

## 1. One role per file
- One exported class or function family per file, named after it.
- `src/index.ts` of each package is its public API and only re-exports.
- Layering: `core` ← engine ← adapters. A lower layer never imports a higher one.

## 2. Layout
```
packages/<name>/
  package.json
  src/
    index.ts           public API
    <thing>.ts
  test/
    <thing>.test.ts     (.test.tsx when it holds JSX: the React package's)
```

## 3. Naming
- Files in kebab-case (`linked-list.ts`); types and classes in PascalCase; functions and variables in
  camelCase.
- Domain names are exactly the Terms of `docs/shared/PRODUCT.md` (Board, List, Card, Node, Index,
  Move, Snapshot, Clone, Placeholder, Drop target, Renderer).
- Events are past-tense nouns of what happened: `move`, `change`.
- State attributes the user may style start with `data-lp-` (e.g. `data-lp-dragging`).

## 4. Errors
- Bad input at mount or in a public call (unknown `id`, duplicate `id`, missing container) throws an
  `Error` whose message starts with `list-picker:` and names the value.
- A call that takes the user's elements checks all of them before it writes any (attributes, moves),
  so an error leaves the user's markup as it was.
- Nothing is logged with `console` in library code.
- Code that runs a user callback (a Renderer, a message, `canMove`, `onActivate`) finishes its own
  setup first, so a throw from the callback leaves a working state (L4.1, L4.4).

## 5. Tests
| Behaviour | Seam | Test |
|---|---|---|
| A model operation | the `core` public API | `packages/core/test/<thing>.test.ts`, `it('<does what> when <case>')` |
| A model invariant | the `core` public API, random operation sequences | property test beside the unit tests |
| An engine behaviour | the engine with `happy-dom` and synthetic pointer events | `packages/vanilla/test/<thing>.test.ts` |
| A real drag | the demo page in Playwright | `e2e/<flow>.e2e.ts` (from M2) |

**Browser tests** run with the browser's user-facing defaults (scrollbars, viewport, motion); a
test that changes one says why in a comment.
A behaviour with a direction (auto-scroll, a drop before or after) is tested in each direction.

**Property tests** assert that they reached their interesting outcomes (a minimum count of each),
so a weak generator fails instead of passing blind.
They set an explicit Vitest timeout (60 s) and fast-check's `interruptAfterTimeLimit` (50 s, with
`markInterruptAsFailure`), so a loaded machine does not flake them and a failure stops shrinking in
time to be reported.

**Benchmarks** build their fixtures outside the timing, warm up each side, alternate which side runs
first, and report a median; a decision record states the method next to the numbers.
A measurement script fails when what it counts over is empty (no events found, no samples),
instead of reporting zero.

**A mounted DOM that lags the Board** (during a drag, or until `mount`'s microtask): a change that
allows it lists every reader of the mounted DOM (the drop target, the drop, the demo) and tests
each one (L4.1).

**Focus kept across a move** (a keyboard grab, a card `mount` moves for a Board change made by code)
is tested in Chrome (`e2e/`): happy-dom does not blur a moved element (GOTCHAS).

**The demo's interactions** are tested through its UI (a click, a key), not through `window.board`:
a control that calls the code directly hides a broken UI path (L4.10).

**DOM writes** are counted when a test claims a change touches only some elements (a reconcile that
moves only what is out of place); checking the resulting order alone passes with extra writes.

**Coverage floor:** 80% of lines (`--coverage.thresholds.lines` in the root `test:coverage` script),
measured by the gate over `packages/*/src` (tests and configuration excluded). It is raised when
coverage grows past it and lowered only with the owner's ok. A floor proves tests exist, not that
they came first: the "Seen red" line of the pull request does that.

## 6. Formatting and style
Biome's formatter and its recommended lint rules, configured in `biome.json` **[lint]**. Markdown
and `.claude/` are outside Biome. No `any` without a comment saying why.
