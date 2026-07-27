# Tasks: Restyle Demo Landing — "Dense Ledger"

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-900 (add+del) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (cards) → PR 2 (DemoLanding) → PR 3 (App.tsx cleanup) |
| Delivery strategy | ask-on-risk (default, none cached) |
| Chain strategy | pending — user decision needed |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Basis** (measured from current files): `CharacterCard.tsx` 130 lines (~25 changed), `CharacterCard.test.tsx` +45 (7 new cases), `CampaignRailCard.tsx` 101 lines (~25 changed), `CampaignRailCard.test.tsx` +40 (6 new cases), `DemoLanding.tsx` full rewrite 157→~180 (~337 add+del), `DemoLanding.test.tsx` full rewrite 117→~150 (~267 add+del), `App.tsx` ~17 (7 point-edits per design §4), `App.test.tsx` ~95 (4 blocks removed, 2 anchors swapped), `Home.test.tsx` +8 (one guard). Largest single-file diff (`DemoLanding.tsx`+test) stays isolable; no single file exceeds ~340.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `interactive?: boolean` on `CharacterCard`/`CampaignRailCard` + tests | PR 1 | Independent; ~135 lines |
| 2 | `DemoLanding.tsx` rewrite + test | PR 2 | Depends on PR 1 merged; ~600 lines |
| 3 | `App.tsx` dead-code removal + `App.test.tsx`/`Home.test.tsx` updates | PR 3 | Depends on PR 2 merged; ~120 lines |

**Known pre-existing failures (corrected baseline)**: the original "8 failures in
`CreateCharacterCta.test.tsx`/`CreateCharacter.test.tsx`" reference below was stale —
`CreateCharacterCta.test.tsx` does not exist in this codebase and `CreateCharacter.test.tsx`'s
25 tests all pass. The actual baseline is **1 pre-existing flaky `App.test.tsx` fake-timer test**
(`App create campaign flow > returns home and refreshes characters after creating a character`,
times out only under full-suite parallel load; reproduces on a clean `git stash` and passes in
isolation). Do NOT touch or "fix" that test — it is out of scope. Bar is *no new* failures beyond
this one.

## Phase 1: `CharacterCard` — `interactive` prop (TDD)

- [x] 1.1 RED: add `describe('CharacterCard — interactive mode')` in `CharacterCard.test.tsx` — 7 cases per design §6.2 (default role/tabIndex/CTA, explicit `true`, `false` strips role/tabindex/CTA, click no-op, name/race/AC/strip still render, compiles without `onOpenSheet`)
- [x] 1.2 GREEN: add `interactive?: boolean` to `CharacterCardProps` (default `true`), make `onOpenSheet` optional, add conditional `interactiveProps` spread (role/tabIndex/onClick/onKeyDown), strip `cursor-pointer`/`hover:border-home-border-hi` when `false`, gate footer row (L114-127) on `interactive`
- [x] 1.3 Verify existing 10 `CharacterCard.test.tsx` tests still pass unmodified

## Phase 2: `CampaignRailCard` — `interactive` prop (TDD)

- [x] 2.1 RED: add `describe('CampaignRailCard — interactive mode')` in `CampaignRailCard.test.tsx` — 6 cases per design §6.3 (featured: no CTAs/buttons, name not a button, join code still visible; non-featured: hero name visible/`Open →` absent; role chip/meta unchanged; default contrast case)
- [x] 2.2 GREEN: add `interactive?: boolean` to `CampaignRailCardProps` (default `true`), make `onOpen` optional, swap name `<button>`→`<span>` when `false` (same className), drop `CopyCodeButton` when `false` (keep join-code text), gate featured action row and normal footer `Open →` on `interactive`
- [x] 2.3 Verify existing 8 `CampaignRailCard.test.tsx` tests still pass unmodified

## Phase 3: `DemoLanding` rewrite (TDD) — depends on Phase 1+2

- [ ] 3.1 RED: rewrite `DemoLanding.test.tsx` fully per design §6.1 (12 assertions: sync render, 3 names, campaign name+join code, `LV 3/2` badge, highlighted ability cell, metric tiles vs `DEMO_CHARACTERS.length`, no loading/error UI, exactly one button (CTA), no ancestor `role="button"`/no `tabindex`, `onLoginRequest` fires, no nav/search/avatar/logout/JOIN-A-TABLE/create-CTAs); delete old `vi.mock('../services/api', …)` block and old nav-callback tests
- [ ] 3.2 GREEN: define `DEMO_CAMPAIGN: RailCampaign`, `DEMO_CHARACTERS: Character[]` (3 entries), `DEMO_LEVELS: Map<number, LevelRecord[]>` module constants per design §3.1
- [ ] 3.3 GREEN: rewrite `DemoLanding.tsx` component per design §5 tree — drop `useState`/`useEffect`/`api` import/`../App.css` import, new `DemoLandingProps { onLoginRequest }` only, Dense Ledger shell (header, hero, 4 `MetricTile`s, two-column body with `CharacterCard`/`CampaignRailCard`, both `interactive={false}`, no `onOpenSheet`/`onOpen`/`onManage` passed)
- [ ] 3.4 Run `cd frontend && npx vitest run` for `DemoLanding.test.tsx` — confirm green

## Phase 4: `App.tsx` dead-code removal — depends on Phase 3

- [x] 4.1 RED: in `App.test.tsx`, swap the `Demo Campaign` anchors to the `Log In / Sign Up` CTA button in the 2 surviving tests; delete `beforeEach` `api.demo.*` mocks; delete the 4 dead-navigation tests
- [x] 4.2 RED (guard): confirmed `Home.test.tsx` already asserts Home's cards expose `role="button"` + `Open sheet →` (design §6.4) — no edit needed, passes unmodified
- [x] 4.3 GREEN: applied the 7 point-edits from design §4 in `App.tsx` — deleted `DemoCampaignDetail` import, deleted `demoCharacterId`/`demoCampaignId` state, deleted their resets in `handleLogout` and `onAuthSuccess`, deleted both dead render branches, trimmed `<DemoLanding>` props to only `onLoginRequest`
- [x] 4.4 Ran `cd frontend && npx tsc -b --noEmit` and `cd frontend && npx eslint .` — both clean, no unused-var/import warnings (note: use `-b`, plain `tsc --noEmit` is a no-op in this repo)

## Phase 5: Full regression pass

- [x] 5.1 Ran `cd frontend && npx vitest run` — zero new failures beyond the 1 known pre-existing flaky `App.test.tsx` fake-timer test (see corrected baseline above)
- [x] 5.2 Confirmed `Home.test.tsx` passes in full, unmodified (35/35)
- [x] 5.3 Diffed `Home.tsx`, `Characters.tsx`, `DemoCampaignDetail.tsx`, `services/api.ts`, `interfaces/demo.ts` against pre-change — confirmed zero changes (out-of-scope requirement)
