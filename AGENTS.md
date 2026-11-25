# list-picker

A headless TypeScript library for lists people reorder (a kanban board, a playlist): `core` (the
doubly linked list model, no DOM), the drag engine and the adapters (vanilla first, then React and
Angular), as packages of one npm workspace. It owns behaviour and containers; it never ships a card's look (DEC-07).
The shared docs live in `docs/shared` (start with its `README.md`); `docs/shared/SESSION.md` applies
to every session here. Slice ids in this repository start with `L`.

## Principles
Follow YAGNI and KISS strictly, in code and in communication.
- **Code:** build only what the current slice needs, with the simplest solution that works. No
  abstraction, configuration or generalization "for later".
- **TDD:** write the test first and watch it fail, then write the least code that passes (`tdd` skill).
- **Communication:** short, direct answers. No options that won't be followed, no explanations nobody
  asked for.
- **Language:** code, identifiers, comments and docs in English, with the terms of the ubiquitous
  language (`docs/shared/PRODUCT.md`). The library's only user-facing text is its live
  announcements (DEC-16: English defaults the `messages` option replaces); the demo's copy is
  English. Conversations with the owner may be in Portuguese.
- **Design:** low coupling, high cohesion; the layering of `docs/CONVENTIONS.md` §1.
- **Docs:** every document lives in `docs/`; update what is there before creating something new.
- **Small pull requests:** at most 15 files and 400 lines (SESSION §0). Split the slice before coding
  if it won't fit.

## Read before working
1. `docs/STATE.md` (what exists, the last handoff) and `docs/PLAN.md` (the current slice; work only
   on it).
2. `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`: **the file layout, naming and patterns. Match
   them exactly.**
3. The public API of the package you touch (its `src/index.ts`): a change to it is listed in the
   pull request's "Public API" section.
4. `docs/GOTCHAS.md` before touching the parts of the stack it lists.
5. The skills that match the task, in `.agents/skills/<name>/SKILL.md`. If your agent does not load
   skills by itself, open the matching `SKILL.md` before the task:

   | Skill | When |
   |---|---|
   | `list-picker-code-review` | before opening the pull request (mandatory) |
   | `tdd` | building any behaviour |
   | `diagnosing-bugs` | a hard bug, a check failing for no clear reason, a slowdown |
   | `writing-for-agents` | editing docs, `AGENTS.md` or skills |
   | `retro` | the end of every slice |
   | `grilling` | when the owner wants a plan stress-tested |

   `tdd`, `diagnosing-bugs`, `retro`, `grilling` and `writing-for-agents` are shared and live in
   `list-picker/.agents/skills/`. A new or renamed skill updates this table in the same pull request.

## Non-negotiable
- TypeScript strict, ES modules, no runtime dependencies in `core` or the engine.
- `core` never touches the DOM or a framework; the engine never imports a framework (DEC-09).
- The model is the doubly linked list plus its Index; no array is the source of truth (DEC-06). Every
  operation keeps the PRODUCT invariants, and each invariant has a test.
- Cards stay in the document flow: no absolute positioning of cards, no computed `top`/`height`
  (DEC-08). The Clone moves only with a transform (the `translate` property), inside
  `requestAnimationFrame`.
- No layout read (`getBoundingClientRect`, `offset*`) in a `pointermove` handler after a write in the
  same frame. Batch reads, then writes.
- Never `innerHTML` with user values; the user's Renderer returns an element (or a component).
- Every listener the library adds is removed by `destroy()`; no listener on `window` or `document`
  outside an active Drag.
- A performance claim in a pull request comes with a benchmark or a trace.
- Generated and frozen files are listed in `.agents/protected.json`; regenerate them, never edit them.

## Commands
- **Gate:** `npm run verify`: one command that runs everything CI runs here (format, lint, types, tests
  with the coverage floor, build). CI runs it, plus the title, review-section, size, frozen-files and secret
  (gitleaks) checks.
- **Pull requests:** push the slice branch, open the pull request with `gh`, and squash-merge it
  yourself once every check is green (SESSION §4). Nothing reaches `main` any other way (DEC-04).
- **Install:** `npm ci`. **Test:** `npm test`. **Format and fix lint:** `npm run format`.
- **Playground:** `npm run dev` (Vite, `playground/`); every M1 slice shows its behaviour there.
- Packages live in `packages/<name>`; root scripts run over all of them.
