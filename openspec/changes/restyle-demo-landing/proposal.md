# Proposal: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Date**: 2026-07-27
**Status**: proposed

---

## Intent

The pre-login landing (`frontend/src/pages/DemoLanding.tsx`) still renders the legacy
inline-`style` look while the authenticated `Home.tsx` now ships the "Dense Ledger"
design system. First-time visitors therefore see a screen that does not resemble the
product they are being asked to sign up for.

Success: the landing is visually indistinguishable in style from `Home.tsx` (same
`home-*` tokens, same card geometry/typography), renders instantly from hardcoded
constants (no fetch, no loading, no error state), and offers exactly one action —
Log In / Sign Up.

---

## Scope

### In Scope

- Rewrite `DemoLanding.tsx` with the Dense Ledger shell: dark `bg-home-ink-900` page,
  simplified header (rombo + `D&D MANAGER` wordmark + `Log In / Sign Up` button), hero
  band with logged-out copy, metrics row, two-column body (characters grid left,
  campaign rail right).
- Hardcoded demo data as module constants: **1 campaign + 3 characters**.
- Additive non-interactive mode on `CharacterCard.tsx` and `CampaignRailCard.tsx`
  (see Approach); `MetricTile.tsx` reused as-is.
- Remove `onSelectCharacter` / `onSelectCampaign` props and their `App.tsx` wiring,
  plus the now-unreachable `demoCampaignId` / `demoCharacterId` state and render
  branches. `onLoginRequest` stays.
- Rewrite `DemoLanding.test.tsx` against hardcoded content; update `App.test.tsx` if it
  asserts demo navigation.

### Out of Scope

- No nav tabs, search box, avatar, logout, join-code block, filters/sort, or create CTAs
  on the landing — authenticated-only concepts.
- No changes to `Home.tsx`, `Characters.tsx` (`source="demo"` path), `DemoCampaignDetail.tsx`,
  `services/api.ts` `demo` namespace, `interfaces/demo.ts`, or backend `/api/demo/*`.
  Those files stay on disk, untouched, merely unreferenced by the landing.
- No new design tokens, fonts, dependencies, or responsive rework beyond mirroring
  Home's existing classes.

## Capabilities

### New Capabilities
- `demo-landing`: pre-login landing presentation — layout, hardcoded showcase data,
  non-interactive cards, single Log In / Sign Up affordance.

### Modified Capabilities
- None. `home-dense-ledger` behavior is unchanged; its components only gain an optional,
  default-off non-interactive mode.

---

## Approach

### Decision 1 — Reuse the real components, do NOT duplicate markup (recommended)

`MetricTile` is already presentational and reusable verbatim. `CharacterCard` and
`CampaignRailCard` are the problem: both hardcode interactive affordances
(`role="button"` container + `onOpenSheet` + "Open sheet →" + "···" on the character card;
name button + "Open →" / "Open table" / "Manage" on the rail card).

Two options were considered:

| Option | Pros | Cons |
|---|---|---|
| **A. Additive `interactive?: boolean` (default `true`)** on both components; when `false`, render a plain `div` (no `role`/`tabIndex`/handlers) and drop the CTA/actions row; make `onOpenSheet`/`onOpen` optional | Zero visual drift — one source of truth for the Dense Ledger card look; Home's tests are the regression net | Touches two components used by authenticated Home; small prop-shape churn |
| B. Local static `DemoCharacterCard` / `DemoCampaignCard` inside `DemoLanding` | No risk to Home | Duplicates ~40 long Tailwind class strings that WILL drift on the next restyle — defeats the entire point of this change |

**Recommend A.** The purpose of the landing is to look exactly like the real product; a
copy that silently diverges is worse than a default-preserving optional prop. The
fabricated data is not waste: every field required by `Character` that the card actually
renders (name, `race.name`, `characterClasses[0].name`, the six `abilityScores`,
`velocities[0]`, campaign name, level via `levelsByCharacterId`) is visible on screen.
Filler is limited to `id` / `user` / `characteristics` / `alignment` / `background` /
`xp` / `proficiency` / `proficiencies` / `hp` — roughly 15 literal lines per character.

### Decision 2 — Hero band copy for a logged-out visitor

Keep the band and the 4-tile metrics row (visual parity with Home), but replace
`Welcome back, {firstName}` with logged-out copy — e.g. eyebrow `A LIVE LOOK INSIDE`,
heading `See what your table looks like`, subtitle pointing at Log In / Sign Up.
Metric tiles show hardcoded numbers consistent with the showcase data (`1 CAMPAIGNS`,
`3 CHARACTERS`, plus two static tiles). Consistent numbers matter: an obviously fake
metrics row undermines the "this is real" effect.

### Decision 3 — Dead code

Removing the two card callbacks orphans a chain: `demoCampaignId` was set only by
`DemoLanding`, and `DemoCampaignDetail` was the only other producer of `demoCharacterId`.
Recommend deleting both state slots and both render branches in `App.tsx` (leaving them
would be unreachable code plus unused-setter lint noise). The page components and API
surface stay on disk untouched, so re-linking later is a one-line change.

### Shape of hardcoded data

- 1 campaign, `role: 'DM'`, `featured: true`, with `joinCode`, `playerCount`,
  `characterCount` — exercises the richest rail variant.
- 3 characters covering distinct races/classes, one multiclass to show the `LV 3/2`
  badge, ability scores including at least one `>= 16` to show the highlight.

### Testing

Strict TDD is active (`cd frontend && npx vitest run`). New tests assert rendered
hardcoded content, absence of loading/error/nav/search/avatar, non-interactivity of the
cards, and that `onLoginRequest` fires. `Home.test.tsx` must stay green as the regression
gate for the component prop change. **8 pre-existing failures in
`CreateCharacterCta.test.tsx` / `CreateCharacter.test.tsx` are known — ignore, do not fix.**

---

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `frontend/src/pages/DemoLanding.tsx` | Rewritten | Dense Ledger markup + hardcoded constants; fetch/loading/error removed |
| `frontend/src/pages/DemoLanding.test.tsx` | Rewritten | Assert static content; drop `api.demo.*` mocks |
| `frontend/src/components/CharacterCard.tsx` | Modified | Additive `interactive?: boolean` (default `true`) |
| `frontend/src/components/CampaignRailCard.tsx` | Modified | Additive `interactive?: boolean` (default `true`) |
| `frontend/src/App.tsx` | Modified | Drop 2 props, `demoCampaignId`/`demoCharacterId` state + branches, related imports |
| `frontend/src/App.test.tsx` | Modified (if needed) | Remove demo-navigation assertions |
| `frontend/src/components/MetricTile.tsx` | Unchanged | Reused as-is |
| Backend `/api/demo/*` | Unchanged | Endpoints remain; landing simply stops calling them |

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `interactive` prop regresses authenticated Home | Low | Default `true` preserves current behavior; `Home.test.tsx` + `CharacterCard`/`CampaignRailCard` tests gate it |
| Hardcoded data drifts from real card contracts after a future `Character` change | Medium | Constants are typed as `Character` / `RailCampaign` — `tsc --noEmit` fails loudly on drift |
| `DemoCampaignDetail` becomes unreferenced and rots | Medium | Explicitly documented here as intentional; deleting it is a separate change |
| Landing looks "too logged-in" (users expect real data) | Low | Copy frames it as a preview, not the user's own data |

## Rollback Plan

1. `git revert` the change — `DemoLanding.tsx` and its test return to the fetch-based version.
2. Restore `onSelectCharacter`/`onSelectCampaign` props, `demoCampaignId`/`demoCharacterId`
   state and both render branches in `App.tsx`.
3. Drop the `interactive` prop from both components (inert while unused, so removal is optional).

No backend, schema, or token changes are involved — nothing to undo below the UI layer.

## Dependencies

- `home-dense-ledger` must be merged (it is) — this change consumes its `home-*` tokens,
  fonts, and components.

## Success Criteria

- [ ] Landing renders the Dense Ledger shell with no network request on mount.
- [ ] Header contains only the wordmark and `Log In / Sign Up`; no nav/search/avatar/logout.
- [ ] Character and campaign cards are visually identical to Home's and expose no
      clickable/focusable affordance.
- [ ] `onLoginRequest` is the only callback the component accepts.
- [ ] `npx vitest run` shows no new failures beyond the 8 known pre-existing ones.
- [ ] `npx tsc --noEmit` and `npx eslint .` are clean (no unused state/imports left in `App.tsx`).

---

## Proposal question round (assumptions to confirm before spec)

These were decided by this proposal, not by the user. Flag if wrong:

1. **Hero band kept with logged-out copy + 4 hardcoded metric tiles** — alternative was
   dropping the metrics row entirely.
2. **Shared components gain `interactive?: boolean`** rather than duplicating markup
   locally — this touches two files the authenticated Home depends on.
3. **`demoCampaignId` / `demoCharacterId` state and branches deleted from `App.tsx`**,
   leaving `DemoCampaignDetail.tsx` orphaned but present on disk.
4. **3 characters + 1 campaign** as the showcase volume.

---

## Next Recommended

`sdd-spec` and `sdd-design` (can run in parallel).
