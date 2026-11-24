<!-- INITIATE VARS --->

[TS__URL]: https://www.typescriptlang.org
[TS__BADGE]: https://img.shields.io/badge/TypeScript_7-3178C6?style=flat&logo=typescript&logoColor=fff
[NODE__URL]: https://nodejs.org/en/download
[NODE__BADGE]: https://img.shields.io/badge/Node_26-5FA04E?style=flat&logo=nodedotjs&logoColor=fff
[VITEST__URL]: https://vitest.dev
[VITEST__BADGE]: https://img.shields.io/badge/Vitest_5-6E9F18?style=flat&logo=vitest&logoColor=fff
[BIOME__URL]: https://biomejs.dev
[BIOME__BADGE]: https://img.shields.io/badge/Biome_2-60A5FA?style=flat&logo=biome&logoColor=fff

<!-- END VARS --->

# list-picker

A headless TypeScript library for lists people reorder (a kanban board's lists of cards, a
playlist's tracks): items you can add, remove, reorder and drag, built on doubly linked lists. You
bring the look of every item; it brings the behaviour.
A lab rewriting [list-picker-js](https://github.com/fabiomrosa/list-picker-js) (2017).

| Package | |
| --- | --- |
| [`@list-picker/core`](packages/core) | The Board model: ordered lists of ordered cards, events. No DOM. |
| [`@list-picker/vanilla`](packages/vanilla) | Draws a Board from your Renderers; pointer and keyboard moves, announcements. |

The site, with the docs and the demo board: <https://fabiomrosa.github.io/list-picker/> (locally,
`npm run dev` for the demo; see [Running locally](#running-locally)).

Agents: start with `AGENTS.md`.

## The lab's question

Do doubly linked lists (with an id index) make a board simpler and faster than arrays?

**Faster: yes for the model, and it does not matter for the page.** On the same 2000 seeded card
moves ([decision 0001](docs/decisions/0001-linked-lists-vs-arrays.md), Apple M4 Pro, Node 26, three
runs):

| Board (lists × cards per list) | Linked list (µs/move) | Arrays (µs/move) | Arrays / linked |
| --- | --- | --- | --- |
| 10 × 10 | 0.097 – 0.105 | 0.121 – 0.122 | 1.1 – 1.3× |
| 10 × 100 | 0.139 – 0.150 | 0.399 – 0.419 | 2.8 – 2.9× |
| 20 × 500 | 0.180 – 0.183 | 1.44 – 1.48 | 7.9 – 8.2× |

About equal on small lists, about 3× faster at 100 cards per list and 8× at 500. But even the
slowest case is 1.5 µs per move, and a drag makes one move per drop. What a drag costs is layout,
and that comes from the engine, not the model: a Chrome trace of five real drags
([decision 0002](docs/decisions/0002-drag-layout-trace.md), three runs) found 0 forced layouts in
333 – 335 `pointermove` dispatches, and 12 in 374 animation frames (10 of them from auto-scroll,
one per frame while it scrolls; the record shows how that breakdown was found).

**Simpler: partly.**
- Simpler: in the Board's API a position is "before this item" (or the end), never an index. That
  is what the DOM's `insertBefore` takes, what a drop target finds under the pointer, and what the
  `move` event reports (`prevId`, `nextId`), so no index arithmetic sits between the three, and a
  move is checked in full before anything is unlinked.
- Not simpler: a page still needs arrays to draw from, so `snapshot()` builds at most one per
  change (O(n)); a position people hear ("position 2 of 3") is counted by walking the list; and
  removing a list visits its cards to clear the index. Most of the work was never the model: the drag engine,
  the browser's layout and focus rules, and drawing the Board without redrawing it.

To repeat both measurements (Node 26 and Google Chrome installed):

```sh
npm ci
npm run bench   # decision 0001: linked lists against arrays, 2000 moves per board shape
npm run trace   # decision 0002: forced layouts during five drags of the demo board, in Chrome
```

Each record explains its method and what it does not cover; numbers vary by machine.

## Tech references

[![typescript][TS__BADGE]][TS__URL] [![node][NODE__BADGE]][NODE__URL] [![vitest][VITEST__BADGE]][VITEST__URL]
[![biome][BIOME__BADGE]][BIOME__URL]

## Requirements

- [Node](https://nodejs.org/en/download) 26 or later, with npm 11.

## Running locally

The packages build and test; the playground is the demo board.

```sh
git clone git@github.com:fabiomrosa/list-picker.git
cd list-picker
npm ci
npm test            # the tests once
npm run dev         # the playground at http://localhost:5173
npm run bench       # linked lists against arrays (docs/decisions/0001)
npm run trace       # forced layouts during real drags (docs/decisions/0002)
npm run site        # the site's pages (the demo link works in the built site: npm run site:build)
npm run e2e         # real drags in Chrome (needs Google Chrome installed)
npm run format      # format and apply safe lint fixes
```

Check everything CI checks (lint and format, types, tests with the coverage floor, build, browser
tests):

```sh
npm run verify
```

## Config

None: the library takes its options in code (`docs/ARCHITECTURE.md` "Configuration").

## Docs

| File | Purpose |
| --- | --- |
| `AGENTS.md` (`CLAUDE.md`) | Standing instructions: principles, non-negotiables, commands |
| `docs/STATE.md`, `docs/PLAN.md` | What exists and the last handoff; the slices |
| `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md` | The shape of the code and its rules |
| `docs/GOTCHAS.md` | Traps of this stack and machine |
| `docs/decisions/` | Technical decisions of this repository |
| `docs/shared/` | Session flow, product, decisions, roadmap |
| `OWNER_PLAN.md` | The owner's runbook |

## Standards

**Branches:** `slice/<id>-<short-name>` for a slice of `docs/PLAN.md` (`slice/L1.2-move-card`),
`fix/<short-name>` for a hotfix (`fix/lost-draft`), `docs/<topic>` for a docs-only change.
Kebab-case, never `main`.

**Pull request titles** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0),
with the slice id (or the docs topic) as scope: `<type>(<scope>): <short name>`, imperative,
starting in lowercase, with acronyms and names in their usual case and no final period.
Every pull request is squash-merged, so its title becomes the commit on `main` and `git log main` is
the list of merged slices. CI checks the title.

| Type | For |
| --- | --- |
| `feat` | a new behaviour |
| `fix` | a bug fix |
| `refactor` | a code change that neither adds a behaviour nor fixes a bug |
| `perf` | a code change that improves performance |
| `test` | adding or fixing tests only |
| `docs` | documentation only |
| `build` | the build system or dependencies |
| `ci` | CI configuration and scripts |
| `chore` | configuration files only |
| `revert` | reverting an earlier merge |

Examples: `feat(L1.2): move a card between lists`, `fix(L2.3): keep the placeholder in empty lists`,
`docs(roadmap): split M2`.
