# list-picker state

What exists in this repository now. The code wins over this file: if they disagree, fix this file.
Every slice's pull request updates it (SESSION §3).

## Capabilities
- `LinkedList`: `insertBefore(value, beforeId | null)` (unknown `beforeId` throws), `remove(id)`,
  `get`, `has`, `size`, `first`, `last`, ordered iteration; duplicate ids throw. A property test
  checks every PRODUCT invariant of the list against an array model over 1000 random operation
  sequences.
- `Board<L, C>`: `addList(list, beforeListId | null)`, `addCard(listId, card, beforeCardId | null)`,
  `moveCard(id, toListId, beforeCardId | null)` (returns whether the order changed; validates
  everything before unlinking), `removeCard`, `removeList` (with its cards), `getList`, `getCard`,
  `listOf(cardId)`, `lists()`, `cards(listId)`. Card ids are unique across the Board, list ids
  across the Lists; bad input throws and changes nothing.
- The playground (`npm run dev`) draws a Board as columns of cards (with each card's neighbours) and
  adds lists and cards at the end or before a chosen one, moves cards with ↑ ↓ ← → or a form
  (showing "same place" when nothing changed), and removes with ×.

An npm workspace with one package, `@list-picker/core`, that builds, and the gate
(`npm run verify`: Biome, `tsc`, Vitest with an 80% line floor, build) locally and in CI, plus the
title, size, frozen-files and secret checks.

## Modules
- `packages/core`: `LinkedList`, `Node` (`src/linked-list.ts`); `Board` (`src/board.ts`).
- `playground/`: Vite page over `core`'s source; not published, outside coverage.

## Contract
None yet.

## Known issues
None.

## Last session
- **2026-11-22, L1.7:** `moveCard`; the naive remove-then-insert lost the card on a bad `before`
  (seen red), so every check now runs before the unlink. Playground move buttons and form; fixed a
  blank "to" select on first load (since L1.5).
- **Next:** L1.8 (move a list, Board property test).
- **2026-11-22, L1.6:** `removeCard`, `removeList` (its cards leave the card index); × buttons in
  the playground.
- **2026-11-22, L1.5:** `Board` with lists and cards, a card-to-list index; the playground now
  shows the Board (the plain linked-list view is gone; removing returns in L1.6).
- **2026-11-22, L1.4:** linked-list property test (`fast-check`), seen failing on three planted
  bugs. Nothing new in the playground (no new behaviour).
- **2026-11-22, L1.3:** `remove(id)` in O(1), clearing the removed node's links; the playground's
  remove buttons.
- **2026-11-22, L1.2:** `insertBefore` any existing node; the playground's "before" selector.
- **2026-11-22, L1.1:** `LinkedList` append and read, the playground. Absent nodes are `null`
  (`first`, `last`, `prev`, `next`); `get` of an unknown id is `undefined`. `insertBefore` takes only
  `null` until L1.2 widens it.
- **2026-11-22, M1 playground:** the owner wants to check each slice visually: L1.1 adds a Vite
  playground, every M1 slice extends it, and the owner checks it at the end of M1.
- **2026-11-22, plan M1:** M1 split into L1.1 to L1.11 in `docs/PLAN.md`; ROADMAP marks M0 done;
  ARCHITECTURE's model uses one `insertBefore(value, beforeId | null)`. `main` is protected
  (pull requests only; `gate`, `title`, `size`, `frozen`, `secrets` required).
- **2026-11-22, L0.1 runnable skeleton:** npm workspace, `packages/core`, TypeScript 7, Vitest 5,
  Biome 2, the gate in CI. Seen red: the smoke test, a badly formatted file, coverage at 25%.
- **2026-11-22, bootstrap:** the repository starts from the AI-flow boilerplate: `AGENTS.md`
  (`CLAUDE.md` imports it), skills in `.agents/skills/`, hooks in `.claude/hooks/`, and CI checks.
  Docs filled with the owner's design: linked-list model with an Index (DEC-06), headless
  (DEC-07), clone and placeholder in the flow (DEC-08), vanilla first then React and Angular
  (DEC-09), Pointer Events (DEC-10), move events with neighbours (DEC-11), one npm
  workspace (DEC-12). `docs/shared/CONTRACT.md` removed (single repository).
  Lessons from list-picker-js in ARCHITECTURE.
