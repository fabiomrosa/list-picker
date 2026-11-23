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

A headless TypeScript library for kanban-style boards: lists of cards you can add, remove, reorder
and drag, built on doubly linked lists. You bring the look of every card; it brings the behaviour.
A lab rewriting [list-picker-js](https://github.com/fabiomrosa/list-picker-js) (2017).

Agents: start with `AGENTS.md`.

## Tech references

[![typescript][TS__BADGE]][TS__URL] [![node][NODE__BADGE]][NODE__URL] [![vitest][VITEST__BADGE]][VITEST__URL]
[![biome][BIOME__BADGE]][BIOME__URL]

## Requirements

- [Node](https://nodejs.org/en/download) 26 or later, with npm 11.

## Running locally

The packages build and test; the playground draws the model in the browser (the demo board comes in M3).

```sh
git clone git@github.com:fabiomrosa/list-picker.git
cd list-picker
npm ci
npm test            # the tests once
npm run dev         # the playground at http://localhost:5173
npm run bench       # linked lists against arrays (docs/decisions/0001)
npm run format      # format and apply safe lint fixes
```

Check everything CI checks (lint and format, types, tests with the coverage floor, build):

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
