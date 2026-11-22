---
name: list-picker-code-review
description: The list-picker review checklist. Use when about to open any list-picker pull request (mandatory), or when asked to review list-picker code or a diff.
---

# list-picker-code-review

Review as a reader who did not write the change. If your agent can start a subagent, start one with a
fresh context (not a fork of this conversation) and give it this skill, the slice entry and the diff,
without your summary of the change. Otherwise reread the slice entry before the diff.

Run `git diff main...HEAD --stat` and read every changed file. Answer each item with yes/no + file
reference. Any "no" is fixed before the pull request (or explicitly listed as a deviation in it).

## Scope
- [ ] `scripts/check-pr-size.py main` passes (≤15 files, ≤400 lines).
- [ ] The title is `<type>(<slice id>): <name>`, the name starts in lowercase, and the type matches the change (SESSION §4).
- [ ] Nothing beyond what the entry asks (YAGNI): no unused abstraction, configuration or parameter.
- [ ] Every change serves the current slice entry; nothing from "Out of scope"; extras moved to
      PLAN "Later".

## Layout and naming (CONVENTIONS)
- [ ] Each file has one role, named by its suffix, in the place CONVENTIONS gives it.
- [ ] No module reaches into another module's internals.
- [ ] `core` imports nothing from the DOM, the engine or a framework; the engine imports no framework.
- [ ] No array is kept as a second source of truth beside the linked list; a Snapshot is derived.

## Model (PRODUCT invariants)
- [ ] Every operation that changes links also changes the Index, and the reverse; `head`, `tail` and
      `size` are updated, including the one-node and empty cases.
- [ ] A Move to the same place, and a Move of a node next to itself, are tested and change nothing.
- [ ] Events: one per completed change, none on a no-op or a cancel.

## DOM and performance
- [ ] No absolute positioning or computed size of cards; only the Clone moves, with `transform`.
- [ ] No layout read after a write in the same `pointermove` frame; reads are batched.
- [ ] Every listener added is removed on drop, cancel and `destroy()`.
- [ ] Nothing changes the inside of the user's card; no `innerHTML` with user values.

## Public API
- [ ] Changes to a package's `src/index.ts` are listed in the pull request, additive or breaking.

## Security and privacy
- [ ] No secrets in the code, the demo or the logs.

## Docs
- [ ] `docs/STATE.md` (capabilities, modules, contract, last session), `docs/PLAN.md` status
      (`done (<date>)`), decisions if any, `README.md` if run/config changed, `docs/GOTCHAS.md` for
      new traps.

## Tests
- [ ] Every acceptance criterion has a test that was seen red (test-first, or the rule broken once).
- [ ] Each test exercises what runs, not a declaration the runtime may ignore (break the code once if
      unsure).
- [ ] A mistake this review keeps finding is proposed as a check in the retro.

## Output
Findings for the pull request's Review section. Each one gives the location (`file:line`), the input
or state that triggers it, the impact, and the smallest fix; one not demonstrated is marked as a
hypothesis. "No findings" is a valid result: never invent one to fill the list. After fixes, review
the new diff: a fixed finding is checked again, not assumed.

## Rationalizations
| Rationalization | Reality |
|---|---|
| "It's only docs or config." | Scope, size and the checklist still apply. |
| "The build is green." | Green proves only what the checks check; ask whether each one could fail. |
| "I wrote it, so I know it's right." | That is why the pass reads as someone else. |
