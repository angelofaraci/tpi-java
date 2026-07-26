# Proposal: Home Redesign — "Dense Ledger"

**Change**: home-dense-ledger
**Date**: 2026-07-26
**Status**: proposed

---

## Intent

Replace the current empty, low-hierarchy home/dashboard with the high-fidelity
"Dense Ledger" design: a persistent top-bar shell, a hero band (contextual greeting +
two primary actions + a derived metrics bar), and a two-column body (character cards
grid on the left, campaign rail with join-by-code on the right).

Success looks like:
- The home renders faithfully to the handoff mock (colors, typography, spacing, radii
  are final and exact) at the drawn width of 1280px, and behaves per the prescribed
  responsive rules down to <768px.
- Every metric and card field is derived from data the backend already returns, plus
  the two per-campaign counts (`playerCount`/`characterCount`) newly exposed on the
  list endpoints.
- No other screen (login, character sheet, admin, create-character, create-campaign,
  view-campaign, demo) changes appearance.

---

## Problem Statement

The current home lives as inline JSX inside `frontend/src/App.tsx` (the `view === 'home'`
branch, roughly lines 684–1235 of a 1343-line file). It is four stacked sections
(Characters, Campaigns as DM, Campaigns as Player, Public Campaigns) built with inline
`style={{}}` objects. The layout reads as vertically empty, with no visual hierarchy and
a lot of dead horizontal space, and each section carries a single onboarding card. There
is no unified navigation shell, no at-a-glance metrics, and no dense presentation of what
the user actually controls (their tables and heroes).

The handoff reorganizes the same information — no new endpoints for the layout itself —
into three bands that make the state of the account legible at a glance.

Note: the handoff's own "current state" assumption is wrong. It says today's home lives
in `Characters.tsx`; in reality `Characters.tsx` is the single-character sheet detail page
and the home is inline in `App.tsx`. This proposal follows the corrected reality from
`explore.md`, not the handoff's file table.

---

## Proposed Solution

### Frontend shell + home body

1. **Top bar** — add as a persistent shell in `App.tsx` (rendered across views, not just
   home): brand rombo + wordmark, section nav (`Home` · `Characters` · `Campaigns` ·
   `Admin`, with `Admin` gated on `user.role === 'ADMIN'`), a search field (placeholder
   `Search or paste join code`), an initials avatar derived from `user.username`, and a
   logout action reusing the existing `utils/auth.ts` handler.
2. **Hero + metrics bar** — contextual eyebrow (today's date), greeting
   `Welcome back, {firstName}`, priority-ordered contextual subtitle, and two primary
   actions (`+ New character` → `setView('create-character')`, `+ New campaign` →
   `setView('create-campaign')`). Below it, a metrics bar of derived tiles (`useMemo`,
   never own state).
3. **Two-column body** — `grid-template-columns: 1fr 368px`. Left: character cards grid
   (2 columns) with the dashed `CreateCharacterCTA`. Right: campaign rail (featured +
   normal card variants) plus a persistent `Join a table` block with auto-formatting
   code input.

New/changed frontend components:
- `frontend/src/components/CharacterCard.tsx` — **new**
- `frontend/src/components/CampaignRailCard.tsx` — **new**
- `frontend/src/components/MetricTile.tsx` — **new**
- `frontend/src/components/scoreBox.tsx` — add a compact read-only variant for the
  STR–CHA ability strip (real new layout, not a prop flip)
- `frontend/src/components/CopyCodeButton.tsx` — add a small (12px) size variant

All new view state goes in `App.tsx` per project convention (`filter`, `sort`, `joinCode`,
plus loading/error status); pages/components stay presentational. `filter` and `sort`
persist to `localStorage` (`home.filter`, `home.sort`).

### Backend — per-campaign counts (confirmed in scope)

Extract the player/character union-count logic currently living as a private
`mapToDetail()` helper in `CampaignController` into a reusable `CampaignService` method,
and expose `playerCount` and `characterCount` on both list DTOs:
- `CampaignSummaryDto` (served by `GET /campaigns/mine`)
- `PlayerCampaignSummaryDto` (served by `GET /campaigns/as-player`)

The counts MUST reuse the exact same union logic (explicit `campaign_players` join-table
rows unioned with users derived from `characters[].user`, deduped by id) so the numbers
match what `ViewCampaign.tsx` already shows for the same campaign.

### Fonts (greenfield)

Self-host **Space Grotesk** (400/500/600/700) and **JetBrains Mono** (400/500/600/700) as
`woff2`, latin subset, `font-display: swap`. There is no existing font convention. The
proposal fixes the location: assets under `frontend/public/fonts/`, `@font-face` rules in
the Tailwind entry CSS (`frontend/src/index.css`) alongside the namespaced tokens.

---

## Confirmed Scope Decisions (firm constraints — not up for re-litigation)

### 1. Backend IS in scope

`GET /campaigns/mine` and `GET /campaigns/as-player` have zero count fields today. The
count is non-trivial (a deduped union, not `players.size()`). The chosen approach —
extract to `CampaignService`, expose on both list DTOs — is a HARD requirement of this
change, not an optional enhancement. Numbers on the home MUST agree with `ViewCampaign`
for the same campaign.

### 2. Design tokens are namespaced, NOT merged

`frontend/src/index.css` already declares an `@theme` block with the same variable names
the handoff proposes (`--color-surface`, `--color-border`, `--color-muted`, …) but with
different values and semantics, applied app-wide via a global
`* { border-color: var(--color-border) }` reset. The new design's tokens MUST be declared
under distinct, home-scoped names (e.g. `--home-surface`, `--home-border`, `--home-ink-900`,
`--home-line`, …) so that pasting them does NOT repaint login, character sheet, admin,
create-character, create-campaign, view-campaign, or demo screens. This is a HARD
constraint that directly serves the handoff's own "don't touch other screens" note.

---

## Scope

### In scope

- Top bar as a persistent shell in `frontend/src/App.tsx`.
- Full replacement of the inline home body (~lines 684–1235) in `frontend/src/App.tsx`
  with the three-band Dense Ledger layout.
- New components: `CharacterCard.tsx`, `CampaignRailCard.tsx`, `MetricTile.tsx`.
- `scoreBox.tsx` compact read-only variant; `CopyCodeButton.tsx` 12px size variant.
- Namespaced (`--home-*`) design tokens + `@font-face` rules in `frontend/src/index.css`.
- Self-hosted font assets under `frontend/public/fonts/`.
- Backend: `CampaignService` count method extraction; `playerCount`/`characterCount` on
  `CampaignSummaryDto` and `PlayerCampaignSummaryDto`; wiring in `CampaignController`.
- Prescribed responsive behavior (≥1280 / 1024–1279 / 768–1023 / <768) as real
  behavior, not "nice to have."
- Prescribed states: hover/focus, loading skeletons (geometry-based, not spinner),
  error band with `Retry` (no `alert()`), and empty states (0 characters, 0 campaigns,
  0 of everything).
- Client-derived logic: ability score highlight when `score >= 16`; DM/player dot color;
  level badge (incl. multiclass `LV 3/2`); campaign-name resolution via a `Map` from
  `campaignId` when `Character` only carries the id.

### Out of scope

- `frontend/src/pages/Characters.tsx` — the character-sheet detail page; NOT touched.
- Redesign of any other screen (login, admin, create-character, create-campaign,
  view-campaign, demo). Tokens are namespaced precisely so these stay pixel-identical.
- Any new dependency: no react-router (navigation stays state-based in `App.tsx`), no
  icon library (glyphs are geometric placeholders / text characters), no component
  library.
- New backend endpoints for the layout itself; the only backend change is adding two
  count fields to existing list DTOs.
- Data with no backend equivalent — handled via the handoff's own documented Plan B
  (below), not by inventing fields.

### Data gaps → handoff Plan B (baked in, not to be re-invented)

| Gap | Plan B (from handoff) |
|-----|-----------------------|
| `currentHp` / `maxHp` (only single `hp` exists) | Drop the HP bar; card AC/HP/speed row shows AC + speed only |
| `subclass` (not in repo) | Omit the parenthetical in the card subtitle |
| `sessionNumber` (not in repo) | Omit the `Session N` segment in rail meta |
| Next-session date/time (metric tile 5) | Drop tile 5 entirely; metrics bar becomes `repeat(4,1fr)`, never an empty/"—" tile |

---

## Approach & Rationale

- **Follow existing patterns**: components are presentational (props + callbacks) in the
  style of `Characters.tsx` / `CreateCampaign.tsx`; all state and handlers live in
  `App.tsx`; new API surface (if any) goes under the `campaigns` namespace in
  `services/api.ts`. This keeps the change consistent with the codebase and reviewable.
- **Namespaced tokens over a merge** because the global `* { border-color }` reset means
  redefining shared token values would silently repaint the whole app — the exact thing
  the handoff forbids. Home-scoped names give pixel fidelity with zero blast radius.
- **Backend extraction over duplicating count logic** because re-deriving counts naively
  (`players.size()`) would produce numbers that visibly disagree with `ViewCampaign`.
  Extracting the union logic to `CampaignService` is the only way to guarantee
  consistency and keeps the controller thin.
- **`isDungeonMaster` stays derived/passed**, never read from a raw API field:
  `CampaignDto.dm` is `@JsonIgnore`. Role must come from the endpoint context
  (`/campaigns/mine` = DM, `/campaigns/as-player` = player) or an explicit prop.
- **TDD**: implementation will be test-driven per project convention (strict TDD active,
  `cd frontend && npx vitest run`). Concrete test planning belongs to spec/tasks, not
  this proposal.

---

## Affected Files (summary)

Frontend:
- `frontend/src/App.tsx` — top-bar shell + full home-body replacement + new state/handlers
- `frontend/src/index.css` — namespaced `--home-*` `@theme` tokens + `@font-face`
- `frontend/src/components/CharacterCard.tsx` — new
- `frontend/src/components/CampaignRailCard.tsx` — new
- `frontend/src/components/MetricTile.tsx` — new
- `frontend/src/components/scoreBox.tsx` — compact read-only variant
- `frontend/src/components/CopyCodeButton.tsx` — 12px size variant
- `frontend/public/fonts/` — self-hosted woff2 assets (new)
- `frontend/src/services/api.ts` — only if new typing/fields needed for the counts
- test files — added under strict TDD (planned in spec/tasks)

Backend:
- `CampaignService.java` — new reusable union-count method
- `CampaignController.java` — use the service method for list mapping
- `CampaignSummaryDto.java` — add `playerCount`, `characterCount`
- `PlayerCampaignSummaryDto.java` — add `playerCount`, `characterCount`

Backend contract constraints:
- `CampaignDto.dm` is `@JsonIgnore`; do not rely on it for role.
- New DTO fields are additive; existing consumers (`ViewCampaign`, etc.) unaffected.

---

## Rollback Plan

Frontend (additive except the home-body replacement):
1. Restore the previous inline home JSX branch in `App.tsx` (kept in git history) and
   remove the top-bar shell.
2. Delete `CharacterCard.tsx`, `CampaignRailCard.tsx`, `MetricTile.tsx`.
3. Revert `scoreBox.tsx` and `CopyCodeButton.tsx` variant additions.
4. Remove the `--home-*` `@theme` block and `@font-face` rules from `index.css`; remove
   `frontend/public/fonts/`.

Backend:
5. Remove `playerCount`/`characterCount` from both list DTOs and revert
   `CampaignController` to its inline count logic (keep or drop the extracted
   `CampaignService` method — it is inert if unused).

No database schema or migration changes are involved, so there is nothing to undo at the
data layer.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Changeset exceeds ~400 lines / may need chained PRs** | **High** | Delivery | Home body is ~550 lines replaced + top bar + 3 new components + `scoreBox`/`CopyCodeButton` variants + tokens/fonts + backend across 4 files + TDD tests. This will very likely blow past 400 changed lines. `delivery_strategy` is `ask-on-risk` — flagging now so the orchestrator can decide chaining/stacking before tasks/apply. Natural split points: (a) backend counts, (b) tokens/fonts/CSS shell + top bar, (c) home body + components. |
| Count numbers disagree with `ViewCampaign` if union logic is reimplemented instead of reused | Medium | Correctness | Extract to `CampaignService` and call the SAME method from detail + list paths; add a test asserting parity for a campaign the DM owns via character (not join table). |
| Token bleed repaints other screens if any `--color-*` global token value is touched | Medium | Regression across app | Hard constraint: use only `--home-*` names; do not modify the existing `@theme` values or the global border reset. Visual spot-check login/admin/character sheet after apply. |
| Font FOUT/flash or missing weights | Low | Visual polish | `font-display: swap`; ship all four weights per family; verify latin subset covers the copy. |
| `isDungeonMaster` inferred incorrectly (role) because `dm` is `@JsonIgnore` | Low | Correctness | Derive role from endpoint source or explicit prop; never read a raw `dm` field. |
| Responsive rules are prescribed but not visually drawn | Medium | Interpretation | Treat the handoff's responsive prose as spec; encode exact breakpoints in spec/tasks; measure against the canonical HTML mock for the 1280px baseline. |
| `scoreBox` read-only variant / `CopyCodeButton` 12px variant regress their existing uses | Low | Regression | Additive variants only; keep existing default behavior and existing sizes intact; cover with tests. |

---

## Next Recommended

`sdd-spec` and `sdd-design` (can run in parallel). Spec should encode the exact visual/
behavioral contract (Given/When/Then, RFC 2119) including responsive breakpoints, states,
and count-parity; design should cover `App.tsx` state management, component props
interfaces, the `@JsonIgnore` constraint, and the token-namespacing / backend-extraction
decisions.
