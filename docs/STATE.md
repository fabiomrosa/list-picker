# list-picker state

What exists in this repository now. The code wins over this file: if they disagree, fix this file.
Every slice's pull request updates it (SESSION §3).

## Capabilities
None yet: the repository holds only docs, skills, hooks and the CI checks (size, frozen files,
secrets).

## Modules
None yet.

## Contract
None yet.

## Known issues
None.

## Last session
- **2026-11-22, bootstrap:** the repository starts from the AI-flow boilerplate: `AGENTS.md`
  (`CLAUDE.md` imports it), skills in `.agents/skills/`, hooks in `.claude/hooks/`, and CI checks.
  Docs filled with the owner's design: linked-list model with an Index (DEC-06), headless
  (DEC-07), clone and placeholder in the flow (DEC-08), vanilla first then React and Angular
  (DEC-09), Pointer Events (DEC-10), move events with neighbours (DEC-11), one npm
  workspace (DEC-12). `docs/shared/CONTRACT.md` removed (single repository).
  Lessons from list-picker-js in ARCHITECTURE.
- **Next:** the owner does P1, then L0.1 (runnable skeleton).
