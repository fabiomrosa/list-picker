# Decisions

The register of product and cross-project decisions. **Accepted** entries are binding for every
repository. **Proposed** entries are the agent's recommendations waiting for the owner; until
accepted, a slice that depends on one must stop and ask.

To add a decision: append an entry with the next number, status Proposed, the decision, why, and
consequences. Only the owner changes a status to Accepted. Never edit an accepted decision; supersede
it with a new entry and mark the old one "Superseded by DEC-nn".

---

## DEC-01 · Small slices, merged by pull request — Accepted (owner, 2026-11-22)
Every change is one slice from a `docs/PLAN.md`, one session, one pull request of at most 15 files and
400 lines (SESSION §0). The agent squash-merges it once CI is green and its review is clean (SESSION
§4); the owner can stop any merge with the `hold` label and reads the result in `git log main`.
- **Why:** small diffs stay reviewable, the plan keeps sessions from drifting, and every merge leaves
  one titled commit on `main`.
- **Consequences:** CI enforces the size and the title; a slice that won't fit is split before coding.

## DEC-02 · Any coding agent can work on the project — Accepted (owner, 2026-11-22)
The instructions live in agent-neutral files: `AGENTS.md` (`CLAUDE.md` imports it), skills in
`.agents/skills/`, and the rules that must always hold as CI checks. `.claude/hooks/` repeat them
earlier for Claude Code only.
- **Why:** the workflow must not depend on one tool.
- **Consequences:** a rule that matters gets a CI check, not only a hook or a sentence.

## DEC-03 · YAGNI, KISS and test-first — Accepted (owner, 2026-11-22)
Build only what the current slice needs, test first, and add a mechanical check only when a real
mistake shows it is needed.

## DEC-04 · Nothing reaches main except a merged pull request — Accepted (owner, 2026-11-22)
No agent commits or pushes to `main`, force-pushes a branch under review, or merges around a red
check.
- **Why:** with merges automated, the pull request is the only record of what changed and why.
- **Consequences:** protect `main` (pull requests only, CI required) when the GitHub plan allows it;
  GitHub Free cannot protect a private repository's branches, so `guard-git.py` blocks it in Claude
  Code and the CI job `main-via-pr` flags it for any agent.

## DEC-05 · One name per component, `list-picker-<role>`, in every tool — Accepted (owner, 2026-11-22)
Each repository's name (`list-picker`) is also its local folder and the name of its project in every
provider (hosting, error tracking, analytics, builds) and in alerts. A new component is
`list-picker-<role>`, with a role noun that will not need renaming (`site` for a public site, `web`
only for a web version of an app).
- **Why:** outside the code host the organization is not shown, so a bare `site` or `admin` says
  nothing in a terminal tab, an alert or a provider's project list, and global names are often taken,
  which would give a component a second name.
- **Consequences:** a hostname or slug a provider forces differently is noted in that repository's
  README "Config".

## DEC-06 · The model is doubly linked lists with an id index — Accepted (owner, 2026-11-22)
The Board is a doubly linked list of Lists and each List a doubly linked list of Cards. Each linked
list keeps a `Map<id, Node>` next to it, so find, insert before/after, remove and move are all O(1).
- **Why:** the lab's theory: with a node in hand, a move is a few pointer changes, with no index
  arithmetic and no recomputing positions. The Index removes the O(n) search a bare linked list has
  when the drag starts from an `id` or an element.
- **Consequences:** every operation keeps the Index and the links in step (PRODUCT invariants);
  renderers that need arrays read a Snapshot. Whether it is faster than arrays is measured, not
  assumed: the real cost of a board is usually layout, not splicing.

## DEC-07 · Headless: the user renders every card and list — Accepted (owner, 2026-11-22)
The library ships containers, the Clone and the Placeholder, and no visual style. The user passes
their own Renderer for cards (and lists), with its own behaviour.
- **Why:** `list-picker-js` fixed the markup and the styles, which made it rigid.
- **Consequences:** no default theme in v1; the demo styles live in the demo only. State the user
  may style is exposed as attributes or classes (e.g. dragging, drop target), never as inline styles
  the user must fight.

## DEC-08 · Drag with a clone and a placeholder, in the normal flow — Accepted (owner, 2026-11-22)
On drag start the card is cloned; the Clone follows the pointer and the original's place is held by
a Placeholder of the same size. Over a List the Placeholder goes before or after the card under the
pointer, or at the end below the last card. Cards stay in the document flow, so nothing recomputes
sizes or positions. Drop moves the node in the model and emits the move event (or calls the
callback).
- **Why:** the browser already stacks elements; the 2017 version positioned every card absolutely
  and recomputed `top` and `height` after each change.
- **Consequences:** the engine reads layout only when it must and moves the Clone with `transform`
  inside `requestAnimationFrame` (no layout thrashing).

## DEC-09 · Vanilla first, then React and Angular — Accepted (owner, 2026-11-22)
`core` (no DOM) and the drag engine are plain TypeScript with no dependencies. The vanilla adapter
ships first; React and Angular adapters come after v1 as thin layers over the same core and engine.
- **Why:** one implementation of the behaviour, tested once; adapters only bind it.
- **Consequences:** `core` exposes an event emitter of its own and a Snapshot, so frameworks can
  subscribe and render arrays; nothing in `core` or the engine imports a framework.

## DEC-10 · Pointer Events, not the HTML5 drag-and-drop API — Accepted (owner, 2026-11-22)
The engine listens to `pointerdown`/`pointermove`/`pointerup` with pointer capture.
- **Why:** the native API has no touch support and almost no control over the drag image; Pointer
  Events cover mouse, touch and pen with one code path.
- **Consequences:** the engine owns the threshold, the Clone, auto-scroll and Esc to cancel.

## DEC-11 · The move event names neighbours, not indexes — Accepted (owner, 2026-11-22)
A move event carries `{ id, fromListId, toListId, prevId, nextId }` (`null` at the ends).
- **Why:** it maps one-to-one onto the linked list, and a backend can persist the order from it
  (or compute a fractional rank) without trusting indexes that shift.
- **Consequences:** indexes, when a renderer wants them, come from the Snapshot.

## DEC-12 · One repository, an npm workspace of packages — Accepted (owner, 2026-11-22)
`packages/core`, `packages/vanilla`, then `packages/react` and `packages/angular`, each created by
the slice that first needs it, with one gate (`npm run verify`) over all of them.
- **Why:** the adapters change together with core; one repository keeps one plan, one CI and atomic
  changes across packages.
- **Consequences:** DEC-05's one-name-per-repository applies to the repository; package names on npm
  are chosen when the first one is published.

---

## Proposed (waiting for the owner)
None.
