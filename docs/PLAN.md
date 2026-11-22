# list-picker plan

This repository's track of `docs/shared/ROADMAP.md`, with entries in the template of
`docs/shared/SESSION.md` §0. Slice ids start with `L`.

---

### L0.1 · Runnable skeleton
- **Status:** done (2026-11-22)
- **Goal:** an empty project that builds, formats, tests and runs, with its gate in CI.
- **Depends on:** DEC-12 (accepted), P1.
- **In scope:**
  - The npm workspace (root `package.json`, `tsconfig` base, strict) with `packages/core` empty but
    building: its `package.json`, `tsconfig`, `src/index.ts`.
  - Vitest and Biome at the ARCHITECTURE versions, pinned.
  - The formatter and linter, wired into the gate.
  - One smoke test in `packages/core/test/`.
  - Coverage in the gate, failing below the floor of `docs/CONVENTIONS.md` §5 (80% of lines).
  - CI: the `gate` job in `.github/workflows/ci.yml` running `npm run verify`.
  - `README.md`: Tech references, Requirements, Running locally, Config (as far as the skeleton
    goes).
  - The gate as one command (`npm run verify`), the same one CI runs.
- **Out of scope:** any feature; `packages/vanilla` and the others; Playwright; publishing.
- **Contract:** none.
- **Acceptance criteria:**
  1. `npm run verify` passes from a clean clone.
  2. A badly formatted file fails the gate (seen once).
  3. The smoke test passes, and fails when broken (seen once).
  4. Coverage below the floor fails the gate (seen once).
  5. CI is green on the pull request.
- **Files:** ~12: root `package.json`, lockfile, `tsconfig.base.json`, `biome.json`, `vitest.config.ts`,
  `packages/core/{package.json,tsconfig.json,src/index.ts,test/smoke.test.ts}`, `ci.yml`, `README.md`;
  then PLAN, STATE, CONVENTIONS and ARCHITECTURE "Stack".
- **References:** ARCHITECTURE "Stack", GOTCHAS.

## Later
Ideas not planned yet; a milestone's planning picks from here.
- Click to select several cards, then click a target List to move them all (from list-picker-js).
- A "keep original order" mode: a card returning to a List goes back to its original position
  (list-picker-js `order`).
- A grab-side state attribute so the user can tilt the Clone (list-picker-js).
- Fractional ranks (LexoRank-like) computed from a move event, as a helper for persistence.
- Virtualised Lists for very long boards.
