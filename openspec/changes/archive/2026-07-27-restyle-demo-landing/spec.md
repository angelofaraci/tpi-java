# Specification: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Date**: 2026-07-27
**Status**: proposed

## Purpose

Define the full behavioral contract for the pre-login demo landing
(`frontend/src/pages/DemoLanding.tsx`, rendered by `App.tsx` before
authentication) after it is restyled to match the "Dense Ledger" design
system already shipped for the authenticated home
(`openspec/changes/home-dense-ledger/spec.md`). This is a new capability
spec (`demo-landing`); it does not restate `home-dense-ledger`'s
requirements, only the additive, default-preserving changes two of its
components (`CharacterCard`, `CampaignRailCard`) gain so the landing can
reuse them. Visual tokens (colors, spacing, radii, fonts) are NOT restated
here — see `home-dense-ledger`'s spec/design.

## Requirements

### Requirement: Landing Renders Statically, No Network Fetch

`DemoLanding` MUST render its full content synchronously from hardcoded
module-level constants — one campaign object and an array of three
character objects, both typed against the real `RailCampaign` and
`Character` interfaces (not a separate demo DTO shape). `DemoLanding` MUST
NOT call `api.demo.campaigns()`, `api.demo.characters()`, or any other
network request on mount or at any point in its lifecycle. `DemoLanding`
MUST NOT contain `loading` or `error` state, and MUST NOT render a loading
indicator, spinner, or error band under any circumstance.

#### Scenario: No fetch on mount
- GIVEN the demo landing is rendered
- WHEN it mounts
- THEN no call to `api.demo.campaigns`, `api.demo.characters`, or any other
  `api.*` method occurs
- AND no `fetch`/network activity is observed

#### Scenario: Content is present on first render, no loading state
- GIVEN the demo landing is rendered
- WHEN the component mounts
- THEN the hardcoded campaign and all 3 hardcoded characters are present in
  the DOM immediately (no intermediate loading/skeleton/spinner frame)

#### Scenario: Hardcoded data volume
- GIVEN the demo landing's module constants
- WHEN they are inspected
- THEN exactly 1 campaign and exactly 3 characters are defined

### Requirement: Dense Ledger Shell and Page Structure

`DemoLanding` MUST render the same page shell as the authenticated home
(`view === 'home'` in `App.tsx`): a dark page background using the
`home-*` Tailwind tokens (e.g. `bg-home-ink-900`), the same hero band
layout, the same 4-tile metrics row, and the same two-column body layout
(character cards grid on the left, campaign rail on the right) using the
identical `CharacterCard`, `CampaignRailCard`, and `MetricTile` components
that `Home.tsx` uses. `MetricTile` MUST be reused unmodified.

#### Scenario: Shell uses home-* tokens
- GIVEN the demo landing renders
- WHEN its root container's classes are inspected
- THEN it uses `home-*` Tailwind token classes (e.g. `bg-home-ink-900`),
  not the legacy `app-shell`/inline-`style` markup

#### Scenario: Two-column body layout present
- GIVEN the demo landing renders at desktop width
- WHEN the body is inspected
- THEN the character cards render in a grid on the left and the campaign
  rail renders on the right, matching Home's layout

### Requirement: Simplified Header — Wordmark and Auth CTA Only

The header MUST render only the rombo/logo mark, the `D&D MANAGER`
wordmark, and a single `Log In / Sign Up` button. The header MUST NOT
render nav items (`Home`, `Characters`, `Campaigns`, `Admin`), a search
field, a user avatar, or a `Logout` control.

#### Scenario: Header contains only wordmark and auth CTA
- GIVEN the demo landing renders
- WHEN the header is inspected
- THEN it contains the wordmark and a `Log In / Sign Up` button
- AND no nav items, search field, avatar, or logout control are present

#### Scenario: Log In / Sign Up triggers onLoginRequest
- GIVEN the demo landing is rendered with an `onLoginRequest` handler
- WHEN the user clicks `Log In / Sign Up`
- THEN `onLoginRequest` is called exactly once

### Requirement: Logged-Out Hero Copy and Hardcoded Metrics

The hero band MUST NOT show `Welcome back, {firstName}` or any other
copy implying the visitor is authenticated or that the data shown belongs
to them. It MUST instead use logged-out framing copy (e.g. an eyebrow,
heading, and subtitle inviting the visitor to log in or sign up). The
hero MUST render exactly 4 metric tiles whose values are hardcoded and
internally consistent with the hardcoded showcase data (i.e. the
campaigns-count tile reads `1` and the characters-count tile reads `3`,
matching the module constants).

#### Scenario: No "Welcome back" copy
- GIVEN the demo landing renders
- WHEN the hero band is inspected
- THEN no text containing "Welcome back" is present

#### Scenario: Metric tiles match hardcoded data
- GIVEN the demo landing's hardcoded constants (1 campaign, 3 characters)
- WHEN the metrics row renders
- THEN exactly 4 tiles are shown
- AND the campaigns tile reads `1` and the characters tile reads `3`

### Requirement: Non-Interactive Card Mode (`interactive?: boolean`)

`CharacterCard` and `CampaignRailCard` MUST each accept an additive,
optional `interactive?: boolean` prop defaulting to `true`. This is a
regression-sensitive requirement: when the prop is omitted or `true`,
both components MUST render and behave EXACTLY as they do today for the
authenticated `Home.tsx` — same DOM structure, same `role="button"`,
`tabIndex`, click/keydown handlers, and CTA affordances. `Home.tsx` itself
MUST NOT pass `interactive={false}` anywhere; its existing behavior is
unchanged by this capability.

When `interactive={false}`:
- `CharacterCard` MUST render its outer container as a plain `div` with no
  `role="button"` and no `tabIndex`, MUST NOT attach `onClick`/`onKeyDown`
  handlers that call `onOpenSheet`, MUST NOT render the "Open sheet →" CTA
  text, and MUST NOT render the "···" more-actions button.
- `CampaignRailCard` MUST NOT render its campaign-name click handler,
  MUST NOT render "Open →" (normal variant) or "Open table" / "Manage"
  (featured variant) CTA buttons, and MUST NOT attach any click handler
  that calls `onOpen`/`onManage`.
- On both components, `onOpenSheet` / `onOpen` and `onManage` MUST become
  optional and MUST NOT be invoked at any point while `interactive={false}`,
  even if a caller happens to pass them.

#### Scenario: Default interactive=true preserves current Home behavior
- GIVEN `CharacterCard` is rendered without the `interactive` prop (as
  `Home.tsx` does today)
- WHEN the card renders
- THEN it has `role="button"`, `tabIndex={0}`, and clicking it calls
  `onOpenSheet` — identical to pre-change behavior
- AND `Home.test.tsx` continues to pass unmodified

#### Scenario: interactive=false strips affordances on CharacterCard
- GIVEN `CharacterCard` is rendered with `interactive={false}` and no
  `onOpenSheet` prop supplied
- WHEN the card renders
- THEN no `role="button"` or `tabIndex` attribute is present
- AND no "Open sheet →" or "···" text is rendered
- AND clicking anywhere on the card triggers no handler and no error

#### Scenario: interactive=false strips affordances on CampaignRailCard
- GIVEN `CampaignRailCard` is rendered with `interactive={false}` (both
  featured and normal variants) and no `onOpen`/`onManage` props supplied
- WHEN the card renders
- THEN no "Open →", "Open table", or "Manage" CTA is rendered
- AND clicking the campaign name (or anywhere in the card) triggers no
  handler and no error

#### Scenario: Home's authenticated cards remain interactive
- GIVEN the authenticated `Home.tsx` view renders its character grid and
  campaign rail
- WHEN the cards are inspected
- THEN none of them are rendered with `interactive={false}`
- AND all existing click/keyboard navigation behavior is unchanged

### Requirement: DemoLanding Callback Contract

`DemoLanding` MUST accept exactly one callback prop: `onLoginRequest: () =>
void`. It MUST NOT accept `onSelectCharacter` or `onSelectCampaign` (or any
other navigation callback). All `CharacterCard` and `CampaignRailCard`
instances rendered within `DemoLanding` MUST be passed `interactive={false}`
and MUST NOT be passed `onOpenSheet`, `onOpen`, or `onManage`.

#### Scenario: DemoLanding prop shape
- GIVEN `DemoLandingProps` is inspected
- WHEN its shape is compared to the pre-change version
- THEN it exposes only `onLoginRequest` and no longer exposes
  `onSelectCharacter` or `onSelectCampaign`

#### Scenario: Cards inside the landing are non-interactive
- GIVEN the demo landing renders its character grid and campaign rail
- WHEN the cards are inspected
- THEN every `CharacterCard` and `CampaignRailCard` instance has
  `interactive={false}`
- AND clicking any card produces no navigation and no console error

### Requirement: App.tsx Dead Code Removal

`App.tsx` MUST NOT retain the `demoCampaignId` / `demoCharacterId` state
slots, their setters, or the render branches that consumed them (the
`DemoCampaignDetail`/character-sheet branches reachable only via the old
`onSelectCampaign`/`onSelectCharacter` callbacks). `App.tsx` MUST NOT pass
`onSelectCharacter` or `onSelectCampaign` to `DemoLanding`. Removing this
dead code MUST NOT leave unused imports, unused state, or unused setters
behind.

#### Scenario: No dead state or branches remain
- GIVEN `App.tsx` after the change
- WHEN its source is inspected
- THEN no `demoCampaignId`/`demoCharacterId` state, setters, or dependent
  render branches exist
- AND `DemoLanding` is invoked with only an `onLoginRequest` prop

#### Scenario: Static analysis is clean
- GIVEN the change is complete
- WHEN `npx tsc --noEmit` and `npx eslint .` are run from `frontend/`
- THEN both complete with no errors, including no unused-variable/unused-
  import warnings in `App.tsx`

### Requirement: Test Suite Regression Gate

Rewriting `DemoLanding.test.tsx` MUST assert the hardcoded content
(campaign name, all 3 character names), the absence of any loading/error
state, the absence of nav/search/avatar/logout elements, the non-
interactivity of the rendered cards, and that clicking `Log In / Sign Up`
calls `onLoginRequest`. `App.test.tsx` MUST be updated to remove any
assertions of demo in-page navigation (`onSelectCharacter`/
`onSelectCampaign` wiring) that no longer apply. `Home.test.tsx` MUST
continue to pass unmodified as the regression gate for the `CharacterCard`/
`CampaignRailCard` prop change.

#### Scenario: Full suite has no new failures
- GIVEN the change is complete
- WHEN `cd frontend && npx vitest run` is executed
- THEN there are no new failures beyond the 8 pre-existing, known failures
  in `CreateCharacterCta.test.tsx` / `CreateCharacter.test.tsx`
- AND `Home.test.tsx` passes in full

### Requirement: Out of Scope — Untouched Files and Endpoints

This change MUST NOT modify `frontend/src/pages/Home.tsx`,
`frontend/src/pages/Characters.tsx` (its `source="demo"` path),
`frontend/src/pages/DemoCampaignDetail.tsx`, the `demo` namespace in
`frontend/src/services/api.ts`, `frontend/src/interfaces/demo.ts`, or any
backend `/api/demo/*` endpoint. These MUST remain present and unmodified
on disk; they become unreferenced by the landing but are not deleted as
part of this change. No nav tabs, search box, avatar, logout, join-code
input block, filters/sort controls, or create-entity CTAs (authenticated-
only concepts) MUST appear on the landing.

#### Scenario: Untouched files remain on disk unmodified
- GIVEN the change is complete
- WHEN `Home.tsx`, `Characters.tsx`, `DemoCampaignDetail.tsx`,
  `services/api.ts` (demo namespace), and `interfaces/demo.ts` are diffed
  against their pre-change state
- THEN no changes are present in any of them

#### Scenario: Backend demo endpoints unchanged and unused
- GIVEN the change is complete
- WHEN the backend `/api/demo/*` endpoints are inspected
- THEN their implementation is unchanged
- AND the demo landing makes no request to any of them

#### Scenario: Authenticated-only UI absent from the landing
- GIVEN the demo landing renders
- WHEN the DOM is inspected
- THEN no join-code input block, filter/sort controls, or "+ New
  character"/"+ New campaign" style create CTAs are present
