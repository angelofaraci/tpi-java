# Apply Progress: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Batch**: PR #3 of 3 (stacked-to-main chain strategy, FINAL batch) — this batch adds to the
PR #1/#2 history below
**Scope this batch**: tasks.md Phase 4 + Phase 5 (the whole remainder)

## Status: ALL PHASES COMPLETE — change ready for `sdd-verify`

- [x] Phase 1: `CharacterCard` — `interactive` prop (TDD)
- [x] Phase 2: `CampaignRailCard` — `interactive` prop (TDD)
- [x] Phase 3: `DemoLanding` rewrite (PR #2)
- [x] Phase 4: `App.tsx` dead-code removal (this batch, PR #3)
- [x] Phase 5: Full regression pass (this batch, PR #3)

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

## PR #2 — Phase 3: `DemoLanding.tsx` rewrite (TDD)

### What was done

- `frontend/src/pages/demoLandingData.ts` (**new file**): module constants `DEMO_CAMPAIGN:
  RailCampaign`, `DEMO_CHARACTERS: Character[]` (3 entries: Kaelen Vurr / Dragonborn / Paladin,
  Sylra Moonhollow / Wood Elf / Ranger+Rogue multiclass, Bram Ironkettle / Rock Gnome /
  Artificer), and `DEMO_LEVELS: Map<number, LevelRecord[]>`, exactly per design.md §3.1's table
  (same ids, ability scores, classes). Ability scores include STR 17 + CHA 16 (card 1), DEX 18 +
  WIS 16 (card 2), INT 17 (card 3) so at least one `data-highlighted="true"` ability cell renders
  per card. `DEMO_LEVELS` keys (9101/9102/9103) and each record's `dndClass.id` line up exactly
  with the corresponding character's `characterClasses[].id`, per the non-obvious
  `deriveLevelBadge` contract flagged in design.md §3.1 — verified via the `LV 3/2` test
  assertion.
- `frontend/src/pages/DemoLanding.tsx` (**rewritten**): now a pure render function, no
  `useState`/`useEffect`/`api` import/`../App.css` import. `DemoLandingProps` narrowed to
  `{ onLoginRequest: () => void }` only — `onSelectCharacter`/`onSelectCampaign` removed from
  both the type and all internal usage. Renders the Dense Ledger shell: simplified header
  (rombo + wordmark + single `Log In / Sign Up` button, no nav/search/avatar/logout), hero band
  with static eyebrow `A LIVE LOOK INSIDE` (not `new Date()`, per design.md ADR-04), logged-out
  copy, 4 hardcoded `MetricTile`s (`1`/`DEMO_CHARACTERS.length`/`1`/`4`), and the two-column body
  (`CharacterCard` grid left, `CampaignRailCard` rail right), both consumed with
  `interactive={false}` and no `onOpenSheet`/`onOpen`/`onManage` passed (both already merged
  from PR #1 — not re-implemented here).
- `frontend/src/pages/DemoLanding.test.tsx` (**fully rewritten**): deleted the old
  `vi.mock('../services/api', …)` block and all `onSelectCharacter`/`onSelectCampaign` tests.
  11 new tests covering: synchronous render with no loading/error UI, all 3 character names
  present, campaign name + join code present, `LV 3/2` multiclass badge, at least one
  `data-highlighted="true"` ability cell, all 4 metric tile labels present with the CHARACTERS
  tile asserted against `DEMO_CHARACTERS.length` (not the literal `3`) and the CAMPAIGNS tile
  containing `1`, exactly one button in the whole tree (the CTA), no `role="button"` ancestor
  for character names and zero `[tabindex]` elements anywhere, `onLoginRequest` fires exactly
  once on CTA click, no nav/search/avatar/logout/sort/JOIN-A-TABLE/create-CTA copy, and no
  "Welcome back" text. TDD followed: confirmed RED first (old component still fetched via
  `api.demo.*` and `DEMO_CAMPAIGN`/`DEMO_CHARACTERS` weren't exported yet → 8/11 failing), then
  implemented `DemoLanding.tsx` + `demoLandingData.ts` → GREEN (11/11 passing).

### Deviation from design.md ADR-02 (documented, justified)

Design.md's ADR-02 specifies the three module constants live **inline in
`DemoLanding.tsx`** as `export const`s, explicitly rejecting a separate
`fixtures/demoLanding.ts` module because it would be "indirection with a single consumer."

That is no longer accurate once the rewritten test file needs the same constants directly (to
assert the CHARACTERS metric tile against `DEMO_CHARACTERS.length` rather than a hardcoded
literal, per design.md §6.1 test #6's own stated intent "so the two can never drift"). Exporting
non-component values (`DEMO_CAMPAIGN`, `DEMO_CHARACTERS`, `DEMO_LEVELS`) directly from
`DemoLanding.tsx` — a page component file — trips
`react-refresh/only-export-components` under this repo's `eslint.config.js`
(`reactRefresh.configs.vite`), which restricts page/component files to exporting components only.
There is no existing `eslint-disable` precedent anywhere else in `frontend/src`, so silencing the
rule inline would have introduced a new, unprecedented pattern.

**Resolution**: extracted the three constants into a new sibling module,
`frontend/src/pages/demoLandingData.ts`, imported by both `DemoLanding.tsx` and
`DemoLanding.test.tsx`. This satisfies both design.md's underlying intent (typed against real
domain interfaces, single source of truth, no literal-drift risk) and the lint constraint,
while keeping the indirection genuinely two-consumer (component + its test) rather than the
single-consumer case ADR-02 was rejecting. `DemoLanding.tsx` itself now exports only the
`DemoLanding` component, and `npx eslint .` is clean on both new/changed files as a result.

### Verification results (this batch)

- `cd frontend && npx vitest run src/pages/DemoLanding.test.tsx` → 11/11 passed.
- `cd frontend && npx vitest run` (full suite) → **265 passed, 7 failed** (272 total, up from
  267 because `DemoLanding.test.tsx` grew from 6 to 11 tests).
  - 1 failure is the already-known pre-existing flaky `App.test.tsx > App create campaign flow >
    returns home and refreshes characters after creating a character` fake-timer test — unrelated,
    not touched, matches PR #1's documented baseline.
  - The other 6 failures are all in `describe('App demo landing (unauthenticated)')` in
    `App.test.tsx` — **expected and in-scope-for-PR-#3**: they assert on the old
    `DemoLanding` behavior (`api.demo.*` mocks, `Demo Campaign` text, `onSelectCharacter`/
    `onSelectCampaign` navigation into `Characters`/`DemoCampaignDetail`) which no longer exists
    now that `DemoLanding` is static and narrower. `App.test.tsx` itself is explicitly out of
    scope for this batch (Phase 4 / PR #3 per tasks.md); these 6 failures are the "temporary
    cross-PR inconsistency" the orchestrator's instructions anticipated, not a regression
    introduced carelessly. **PR #3 must**: delete these 4 dead-navigation tests, swap the 2
    surviving tests' `Demo Campaign` anchor to `The Sunken Crown`/the CTA button, and delete the
    `beforeEach` `api.demo.*` mock setup, per design.md §6.5's table.
- `cd frontend && npx tsc -b --noEmit` → **exactly one expected error location**, at
  `App.tsx:732-733` (`<DemoLanding onLoginRequest={...} onSelectCharacter={...}
  onSelectCampaign={...} />` — the old 3-prop call site against the new 1-prop
  `DemoLandingProps`). This is the explicitly pre-approved, temporary cross-PR mismatch — not
  fixed here, to be resolved in PR #3 per the orchestrator's scope instructions. No other tsc
  errors anywhere in the project.
  - **Environment note for future batches**: plain `npx tsc --noEmit` from `frontend/` silently
    type-checks nothing meaningful, because the root `tsconfig.json` has `"files": []` with
    project references and no `-b` (build) flag — running it reported 0 errors even for
    deliberately-broken sanity-check files. The correct invocation (matching this repo's own
    `"build": "tsc -b && vite build"` script) is `npx tsc -b --noEmit`. Use `-b` for all future
    apply/verify batches in this repo, or tsc errors will be silently missed.
- `cd frontend && npx eslint .` → **1 pre-existing error** (`Characters.tsx:297`,
  `no-useless-escape`) and **2 pre-existing warnings** (`AdminPanel.tsx`,
  `react-hooks/exhaustive-deps`) — both files untouched by this batch. Zero errors/warnings in
  `DemoLanding.tsx`, `DemoLanding.test.tsx`, and the new `demoLandingData.ts`.
- Confirmed via `git status`/`git diff --stat` that only `DemoLanding.tsx`,
  `DemoLanding.test.tsx`, and the new `demoLandingData.ts` changed under `frontend/src` — `App.tsx`,
  `Home.tsx`, `Characters.tsx`, `DemoCampaignDetail.tsx`, `services/api.ts`, `interfaces/demo.ts`
  are all untouched, as required.

### Committed

One commit for this work unit (Phase 3: the full `DemoLanding` rewrite + its supporting data
module + rewritten test file — a single deliverable behavior per `work-unit-commits`
conventions). Committed on `main` (already has PR #1 merged); not pushed, no branch created, no
PR opened — per instructions, the orchestrator handles branch creation, push, and PR for this
batch.

## PR #3 — Phase 4 + Phase 5: `App.tsx` dead-code removal + final regression pass

### What was done

- `frontend/src/App.tsx`:
  - Removed `import { DemoCampaignDetail } from './pages/DemoCampaignDetail'`.
  - Removed `demoCharacterId`/`demoCampaignId` state slots (`useState<number | null>(null)` pair).
  - Removed their resets in `handleLogout` (`setDemoCharacterId(null)` / `setDemoCampaignId(null)`).
  - Removed their resets in `Login`'s `onAuthSuccess` callback.
  - Removed the two dead render branches (`else if (demoCharacterId) { <Characters source="demo"> }`
    and `else if (demoCampaignId) { <DemoCampaignDetail> }`) from the unauthenticated routing chain,
    which now collapses to `if (authView === 'login') { <Login/> } else { <DemoLanding/> }`.
  - Trimmed the `<DemoLanding>` call site to `onLoginRequest` only (removed `onSelectCharacter`/
    `onSelectCampaign`), resolving the `App.tsx:732-733` `tsc -b` error from PR #2.
  - All 7 point-edits from design.md §4/ADR-03 applied exactly as specified.
- `frontend/src/App.test.tsx`:
  - Rewrote `describe('App demo landing (unauthenticated)')`: deleted the `beforeEach` `api.demo.*`
    mock setup (no longer called by the static `DemoLanding`), deleted the 4 dead-navigation tests
    (read-only demo character sheet, "Back to Demo", demo campaign detail view, character sheet from
    within demo campaign detail).
  - The 2 surviving tests (`renders the demo landing instead of the login form…`, `switches to the
    login form when the demo CTA is clicked`) were re-anchored to the `Log In / Sign Up` CTA button
    (`getByRole('button', { name: /log in.*sign up/i })`) rather than to campaign-name text.
  - **Deviation from design.md §6.5's literal instruction** ("swap `Demo Campaign` anchor for `The
    Sunken Crown`"): using the campaign-name text directly caused a `TestingLibraryElementError:
    Found multiple elements with the text: The Sunken Crown` — `DEMO_CAMPAIGN.name` ("The Sunken
    Crown") appears 4 times in the rendered tree (once per `CharacterCard`'s `campaignName` label ×3,
    once in the `CampaignRailCard` heading). Design.md §6.5 itself flagged the CTA button as the
    "store-independent" alternative anchor for exactly this reason, so both surviving tests now
    anchor on the CTA button instead of a text match, which is more robust and still exercises the
    same routing behavior the tests exist to cover.
  - Also removed the now-inert `api.demo.campaigns`/`api.demo.characters` mocks from
    `describe('App logout returns to demo landing')`'s `beforeEach` (optional cleanup per design.md
    §6.5's table) — that test already asserted on the CTA button, not on demo data, so it needed no
    other change.
- `openspec/changes/restyle-demo-landing/tasks.md` / `design.md`: corrected the stale "8
  pre-existing failures in `CreateCharacterCta.test.tsx`/`CreateCharacter.test.tsx`" baseline
  (that file doesn't exist) to the actual baseline: 1 pre-existing flaky `App.test.tsx` fake-timer
  test. Also fixed the exit-gate command from plain `tsc --noEmit` (a no-op in this repo) to
  `tsc -b --noEmit`. Marked all remaining tasks.md checkboxes complete.

### Final regression pass results

- `cd frontend && npx vitest run` (full suite) → **267 passed, 1 failed** (268 total). The 1
  failure is the already-known, unrelated, pre-existing flaky `App.test.tsx > App create campaign
  flow > returns home and refreshes characters after creating a character` fake-timer test — not
  touched, matches the corrected baseline exactly. This resolves all 6 of the previously-documented
  `DemoLanding`-related failures from PR #2 (4 deleted as dead-navigation tests, 2 fixed by
  re-anchoring).
- `cd frontend && npx tsc -b --noEmit` → clean, zero errors — resolves the one known
  `App.tsx:732-733` error from PR #2.
- `cd frontend && npx eslint .` → same 1 pre-existing error (`Characters.tsx:297`,
  `no-useless-escape`) and 2 pre-existing warnings (`AdminPanel.tsx`,
  `react-hooks/exhaustive-deps`) as PR #1/#2's baseline — both files untouched by this batch. Zero
  errors/warnings in `App.tsx`/`App.test.tsx` (no unused-var/import noise from the removed state).
- Confirmed via `git diff --stat` against `main` that `DemoCampaignDetail.tsx`, `Characters.tsx`,
  `services/api.ts`, `interfaces/demo.ts` show **zero diff** — fully out-of-scope as required.
- `Home.test.tsx` → 35/35 passed, unmodified; already contains the `role="button"` + `Open sheet →`
  assertions design.md §6.4 asked to guard, so no edit to that file was needed.

### Committed

One commit for this work unit (Phase 4 + Phase 5 together — the `App.tsx` cleanup and its test
updates are a single deliverable: they can't be split further without leaving the tree in a
broken intermediate state, per `work-unit-commits` conventions). Committed on `main` (already has
PR #1 + PR #2 merged); not pushed, no branch created, no PR opened — per instructions, the
orchestrator handles branch creation, push, and PR for this batch.

## Change status: COMPLETE

All 5 phases across PR #1/#2/#3 are done. Full regression suite is green (267/268, 1 known
unrelated flaky test), `tsc -b --noEmit` is clean, `eslint .` is clean on every file touched by
this change, and all out-of-scope files are confirmed untouched. Next recommended step is
`sdd-verify`.
