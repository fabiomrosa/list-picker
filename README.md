<!-- INITIATE VARS --->

<!-- One link and one badge per environment and per technology, e.g.
[PRD__URL]: https://example.com
[PRD__BADGE]: https://img.shields.io/badge/Production-00AB68?style=flat
[NODE__URL]: https://nodejs.org/en/download
[NODE__BADGE]: https://img.shields.io/badge/Node-5FA04E?style=flat&logo=nodedotjs&logoColor=fff -->

<!-- END VARS --->

# list-picker

A headless TypeScript library for kanban-style boards: lists of cards you can add, remove, reorder
and drag, built on doubly linked lists. You bring the look of every card; it brings the behaviour.
A lab rewriting [list-picker-js](https://github.com/fabiomrosa/list-picker-js) (2017).

Agents: start with `AGENTS.md`.

## Tech references

<!-- L0.1: TypeScript, Node, Vitest, Biome badges. -->

## Requirements

<!-- L0.1: Node and npm, pinned. -->

## Running locally

Nothing runs yet: slice L0.1 in `docs/PLAN.md` adds the skeleton, and with it this section:
clone, install, configure, start the dependencies, run.

Check everything CI checks:

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
