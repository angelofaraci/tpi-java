# Apply Progress: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Batch**: PR #1 of 3 (stacked-to-main chain strategy)
**Scope this batch**: tasks.md Phase 1 + Phase 2 only

## Status: Phase 1 and Phase 2 COMPLETE

- [x] Phase 1: `CharacterCard` — `interactive` prop (TDD)
- [x] Phase 2: `CampaignRailCard` — `interactive` prop (TDD)
- [ ] Phase 3: `DemoLanding` rewrite — NOT STARTED (future PR #2)
- [ ] Phase 4: `App.tsx` dead-code removal — NOT STARTED (future PR #3)
- [ ] Phase 5: Full regression pass — partially covered below, final pass belongs to PR #3

## What was done

### `frontend/src/components/CharacterCard.tsx`
- Added additive `interactive?: boolean` prop (default `true`) to `CharacterCardProps`.
- `onOpenSheet` widened from required to optional; invoked as `onOpenSheet?.(character.id)`.
- Outer container spreads `interactiveProps` (`role`, `tabIndex`, `onClick`, `onKeyDown`) only when
  `interactive` is true (conditional object spread — attributes are truly absent, not `undefined`).
- `cursor-pointer` and `hover:border-home-border-hi` classes dropped from `containerClassName` when
  `interactive === false`.
- Footer row (`Open sheet →` + `···` button) is now conditionally rendered on `interactive`.
- Added `import type { KeyboardEvent } from 'react'` (needed once the keydown handler moved into a
  conditionally-typed object literal — TS could no longer infer the param type from the JSX prop).

### `frontend/src/components/CampaignRailCard.tsx`
- Added additive `interactive?: boolean` prop (default `true`) to `CampaignRailCardProps`.
- `onOpen` widened from required to optional; invoked as `onOpen?.(id)` everywhere.
- Campaign name renders as `<button>` when interactive, `<span>` with the identical className when not
  (no handler attached in the inert case).
- `CopyCodeButton` only rendered when `interactive` — the join-code text/well itself always renders.
- Featured action row (`Open table` / `Manage`) only rendered when `interactive`.
- Normal-variant footer `Open →` button only rendered when `interactive`.

### Tests (TDD, RED before GREEN)
- `frontend/src/components/CharacterCard.test.tsx`: added `describe('CharacterCard — interactive mode')`
  with 7 cases (default, explicit `true`, `false` strips role/tabIndex, `false` hides CTA/menu, `false`
  blocks `onOpenSheet` invocation, `false` still renders name/race/AC/ability strip, renders without
  `onOpenSheet` without throwing). Confirmed RED (7 failures) before implementing, then GREEN.
- `frontend/src/components/CampaignRailCard.test.tsx`: added
  `describe('CampaignRailCard — interactive mode')` with 6 cases (featured DM: no buttons at all, name
  not a button, join code well survives without copy button; non-featured PLAYER: hero name renders,
  `Open →` absent; role chip/meta unchanged; default contrast case with `onOpen` firing). Confirmed RED
  before implementing, then GREEN.
- All pre-existing tests in both files (10 in `CharacterCard.test.tsx`, 8 in `CampaignRailCard.test.tsx`)
  pass unmodified — this is the proof the prop is additive per design.md ADR-01's invariant.

## Verification results

- `cd frontend && npx vitest run src/components/CharacterCard.test.tsx src/components/CampaignRailCard.test.tsx`
  → 31/31 passed (17 + 14).
- `cd frontend && npx vitest run` (full suite) → 266 passed, 1 failed.
  - The 1 failure is `App.test.tsx > App create campaign flow > returns home and refreshes characters
    after creating a character` — a `vi.useFakeTimers` test that times out only under full-suite
    parallel load. Verified pre-existing and unrelated: reproduces identically on a clean `git stash`
    (before any of this batch's changes) and passes reliably in isolation both before and after this
    batch's changes. Not touched, not caused by this batch.
  - **Correction to tasks.md/design.md's stated baseline**: the "8 known pre-existing failures in
    `CreateCharacterCta.test.tsx` / `CreateCharacter.test.tsx`" referenced in tasks.md and design.md do
    not exist in this codebase — `CreateCharacterCta.test.tsx` does not exist as a file at all (searched,
    not found). `CreateCharacter.test.tsx` exists and its 25 tests all pass in this run. Whatever
    baseline informed that number in tasks.md/design.md is stale relative to the current `main`. The
    actual baseline is the one flaky `App.test.tsx` timer test described above. This does not block PR
    #1 (that test is unrelated to `CharacterCard`/`CampaignRailCard`), but PR #2/#3 apply batches and
    `sdd-verify` should use "1 known flaky App.test.tsx timer test" as the corrected baseline instead of
    the "8 known failures" language, and should double check whether the 8-failure baseline was
    inherited from an earlier commit or an environment difference.
- `cd frontend && npx tsc --noEmit` → clean, no errors.
- `cd frontend && npx eslint .` → 1 pre-existing error (`Characters.tsx:297`, unrelated
  `no-useless-escape`) and 2 pre-existing warnings (`AdminPanel.tsx`, `react-hooks/exhaustive-deps`).
  Both files are untouched by this batch (confirmed via `git status`/`git log` — last touched in an
  earlier, unrelated commit). Zero errors/warnings in the two files touched this batch.
- `Home.test.tsx` → 35/35 passed, unmodified (design.md §6.4's explicit guard for Home's
  `role="button"` + `Open sheet →` is deferred to Phase 4/PR #3 per tasks.md 4.2 — not in scope here).
- Confirmed via `git status` that `Home.tsx`, `DemoLanding.tsx`, and `App.tsx` have zero diff — untouched
  as required for this batch.

## Committed

One commit for this work unit (Phase 1 + Phase 2 together — they are the same deliverable: the
additive `interactive` prop pattern applied to both Dense Ledger card components, per
`suggested-work-units` Unit 1 in tasks.md's Review Workload Forecast).

## Next batch (PR #2)

Phase 3: `DemoLanding.tsx` rewrite (TDD) — depends on this batch being merged. Follow design.md §5's
component tree and §6.1's 12 test assertions. Do not start until PR #1 is reviewed/merged per the
stacked-to-main chain strategy.
