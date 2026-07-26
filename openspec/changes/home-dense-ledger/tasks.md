# Tasks: Home Redesign — "Dense Ledger"

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950–1150 (home body ~550 replaced + 3 new components ~350 + 2 modified components ~40 + tokens/fonts ~150 + backend 4 files ~120 + tests ~300+) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend counts) → PR 2 (tokens/fonts/top bar) → PR 3 (home body + components + wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend `playerCount`/`characterCount` on both list DTOs, parity-tested | PR 1 | Independent of frontend; base = main (stacked) or tracker branch (feature-branch-chain) |
| 2 | `--color-home-*`/`--font-home-*`/`--radius-home-*` tokens + fonts + `Home.tsx` shell/top bar skeleton | PR 2 | Depends on PR 1 types being available for later wiring, but CSS/top bar itself is independent; base = main or PR 1 branch |
| 3 | New card components + `Home.tsx` body + `App.tsx` wiring/state | PR 3 | Depends on PR 1 (DTO fields) and PR 2 (tokens, Home.tsx shell); base = main or PR 2 branch |

---

## Phase 1: Backend — Count Extraction (api)

- [x] 1.1 RED: Write `CampaignServiceTest` case asserting `countUniquePlayers` counts a DM who owns a character but has no `campaign_players` row (Spec: DM-owned character without join-table row still counts)
- [x] 1.2 GREEN: Add `resolveUniquePlayers(CampaignEntity)`, `countUniquePlayers(CampaignEntity)`, `countCharacters(CampaignEntity)` to `backend/src/main/java/com/utn/javaproject/dndsheets/services/CampaignService.java`, moving the union logic from `CampaignController.mapToDetail`
- [x] 1.3 RED: Write `CampaignSummaryDto`/`PlayerCampaignSummaryDto` field test expecting `playerCount`/`characterCount` getters/setters
- [x] 1.4 GREEN: Add `Integer playerCount; Integer characterCount;` + accessors to `backend/.../dto/CampaignSummaryDto.java` and `backend/.../dto/PlayerCampaignSummaryDto.java`
- [x] 1.5 RED: Write `CampaignControllerTest`/`CampaignServiceTest` case asserting `GET /campaigns/mine` and `GET /campaigns/as-player` populate the two new fields via the service method (not `players.size()`)
- [x] 1.6 GREEN: Wire `mapToSummary`/`findPlayerCampaignSummaries` in `CampaignService` to set both fields via the extracted methods
- [x] 1.7 REFACTOR: Update `CampaignController.mapToDetail` to call `campaignService.resolveUniquePlayers(entity)` instead of its private duplicate logic
- [x] 1.8 RED+GREEN: Write and pass parity test asserting `GET /campaign/{id}` `players.size()` equals list endpoint `playerCount` for the same campaign (Spec: Parity with campaign detail view)
- [x] 1.9 Add `playerCount?: number; characterCount?: number` to `OwnedCampaignSummary` and `PlayerCampaignSummary` in `frontend/src/interfaces/campaign.ts`
- [x] 1.10 Verify: `cd backend && ./mvnw test` — all `CampaignService`/`CampaignController` tests pass, no regressions

## Phase 2: Design Tokens, Fonts, Top Bar (component)

- [ ] 2.1 Add self-hosted font assets to `frontend/public/fonts/`: `space-grotesk-{400,500,600,700}.woff2`, `jetbrains-mono-{400,500,600,700}.woff2`
- [ ] 2.2 Append second `@theme` block to `frontend/src/index.css` with all `--color-home-*`/`--font-home-*`/`--radius-home-*` tokens per design.md (do not touch existing `@theme` block or global border reset)
- [ ] 2.3 Append 8 `@font-face` rules to `frontend/src/index.css` for Space Grotesk (400/500/600/700) and JetBrains Mono (400/500/600/700), `font-display: swap`
- [ ] 2.4 RED: Write a test asserting a non-home screen (e.g. `ViewCampaign`) computed styles are unchanged after the token/font additions (Spec: Other screens unaffected by new tokens)
- [ ] 2.5 GREEN: Confirm test passes (should pass by construction since tokens are additive/namespaced); fix if any leak into global selectors
- [ ] 2.6 RED: Write `Home.test.tsx` top-bar scenarios: renders only on home view, `Admin` nav hidden for `ROLE_USER`, search field is inert, avatar shows uppercase first-two of `user.username`
- [ ] 2.7 GREEN: Create `frontend/src/pages/Home.tsx` with the top-bar markup only (brand, nav items, search field, avatar, logout wired to `utils/auth.ts` handler) to pass 2.6
- [ ] 2.8 Verify: `cd frontend && npx vitest run` — new top-bar/token tests pass, no new failures

## Phase 3: Character Card Component (component)

- [ ] 3.1 RED: Write `CharacterCard.test.tsx` covering ability-highlight threshold (≥16), AC derivation from DEX (`10 + floor((DEX-10)/2)`), subtitle `{race} · {class}`, campaign line `Unassigned` when unresolved
- [ ] 3.2 GREEN: Create `frontend/src/components/CharacterCard.tsx` implementing `CharacterCardProps` per design.md (character, campaignName, isDungeonMaster, onOpenSheet, onRequestDelete)
- [ ] 3.3 RED: Write `scoreBox.test.tsx` case for new `AbilityScoreStrip` export: highlights value when score ≥16, fixed STR–CHA order
- [ ] 3.4 GREEN: Add `AbilityScoreStrip` export to `frontend/src/components/scoreBox.tsx`; keep existing `ScoreBox` untouched
- [ ] 3.5 RED: Write level-badge tests: multiclass `LV 3/2` ordering by `characterClasses` order, badge omitted when no matching `LevelRecord`
- [ ] 3.6 GREEN: Implement level-badge derivation inside `CharacterCard.tsx` (grouped `levelsByCharacterId` passed as prop)
- [ ] 3.7 Verify: `cd frontend && npx vitest run` — `CharacterCard`/`scoreBox` tests pass

## Phase 4: Campaign Rail Card & Metric Tile Components (component)

- [ ] 4.1 RED: Write `CampaignRailCard.test.tsx` covering: DM variant shows join code, PLAYER variant hides join code, meta line reads `{playerCount} players · {characterCount} of your heroes` with no `Session N` segment
- [ ] 4.2 GREEN: Create `frontend/src/components/CampaignRailCard.tsx` implementing `CampaignRailCardProps`/`RailCampaign` per design.md (featured + normal variants)
- [ ] 4.3 RED: Write `MetricTile.test.tsx` covering value/label render and optional `valueClassName`
- [ ] 4.4 GREEN: Create `frontend/src/components/MetricTile.tsx` implementing `MetricTileProps`
- [ ] 4.5 RED: Write `CopyCodeButton.test.tsx` case for new `xs` size variant (12px dimension, iconSize 10), asserting existing sizes unchanged
- [ ] 4.6 GREEN: Widen size union to `'xs' | 'sm' | 'md'` in `frontend/src/components/CopyCodeButton.tsx`
- [ ] 4.7 RED: Write join-code auto-format test: typing `a3f9b72c` yields input value `A3F9-B72C`
- [ ] 4.8 GREEN: Implement uppercase + hyphen-after-4th-char formatting for the `Join a table` input in `Home.tsx`
- [ ] 4.9 Verify: `cd frontend && npx vitest run` — `CampaignRailCard`/`MetricTile`/`CopyCodeButton` tests pass

## Phase 5: Home Body — Hero, Metrics, Grid, Rail, States (component)

- [ ] 5.1 RED: Write `Home.test.tsx` hero scenarios: DM-subtitle priority over player subtitle, onboarding subtitle when both empty, primary actions call `setView('create-character')`/`setView('create-campaign')`
- [ ] 5.2 GREEN: Implement hero band (greeting, subtitle priority logic, two primary action buttons) in `Home.tsx`
- [ ] 5.3 RED: Write metrics-bar test asserting exactly 4 tiles always render (no 5th/empty tile) and tile 4 sums `playerCount` across DM campaigns only
- [ ] 5.4 GREEN: Render metrics bar in `Home.tsx` using the 4 `MetricTile`s and `metrics` prop (`repeat(4,1fr)`)
- [ ] 5.5 RED: Write character-grid test: filter `retired` yields empty grid + `CreateCharacterCTA`, `all`/`active` are identical, sort `level`/`name`/`recent` order correctly
- [ ] 5.6 GREEN: Implement character grid (2-column, `CreateCharacterCTA`, filter/sort application) in `Home.tsx`
- [ ] 5.7 RED: Write campaign-rail test: featured variant picked from first `GET /campaigns/mine` entry, normal variant otherwise, zero-campaigns shows single dashed empty card with `Join a table` still visible
- [ ] 5.8 GREEN: Implement campaign rail (featured/normal selection, empty state, `Join a table` block) in `Home.tsx`
- [ ] 5.9 RED: Write loading/error state tests: 4 skeleton character cards + 3 skeleton rail cards while loading, error band with `Retry` and no `window.alert` call on fetch failure
- [ ] 5.10 GREEN: Implement skeleton and error-band rendering in `Home.tsx` driven by the derived `status`
- [ ] 5.11 Verify: `cd frontend && npx vitest run` — all new `Home.tsx` scenario tests pass

## Phase 6: App.tsx Wiring (wiring)

- [ ] 6.1 Delete the local `interface CharacterCard` at `frontend/src/App.tsx` line 24; import `CharacterCard` from `components/CharacterCard.tsx`; retype `characters` state as `Character[]`
- [ ] 6.2 Add `filter`/`sort`/`joinCode` state to `App.tsx` with `localStorage` read-on-init (`home.filter`, `home.sort`) and `useEffect` persistence per design.md
- [ ] 6.3 RED: Write `App.test.tsx` case: setting `sort=level`/`filter=active`, navigating away and back to home preserves both values and `localStorage` entries
- [ ] 6.4 GREEN: Confirm 6.2 satisfies 6.3; adjust persistence effects if needed
- [ ] 6.5 Add third parallel fetch `api.levels.findAll()` to the mount-time `Promise.all` in `App.tsx` alongside characters/campaigns
- [ ] 6.6 Add `campaignNameById`, `railCampaigns`, `metrics`, `levelsByCharacterId`, derived `status` `useMemo`s to `App.tsx` per design.md
- [ ] 6.7 Add `handleJoinByCode` handler to `App.tsx` (visual-only per spec unless a join endpoint already exists — confirm no new endpoint is introduced)
- [ ] 6.8 Replace the inline home body (`view === 'home'` branch, lines ~684–1235) in `App.tsx` with `<Home ...>` passing all required props/callbacks from design.md's Component Interfaces section
- [ ] 6.9 RED: Write `App.test.tsx` navigation cases: `CharacterCard` click → `setView('character-sheet')` with selected id; rail `Open`/campaign name click → `setView('view-campaign')` with selected id
- [ ] 6.10 GREEN: Wire `onOpenSheet`/`onOpenCampaign`/`onManageCampaign` callbacks passed into `<Home>` to existing `handleViewCharacter`/`handleViewCampaign`
- [ ] 6.11 Verify: `cd frontend && npx tsc --noEmit` — no type errors after `CharacterCard` interface deletion and retype
- [ ] 6.12 Verify: `cd frontend && npx vitest run` — full suite, no new failures beyond the 2 known pre-existing `CreateCharacter.test.tsx` failures

## Phase 7: Responsive Behavior (component)

- [ ] 7.1 RED: Write viewport-based tests (via `window.matchMedia`/resize mock or class assertions) for: rail-width `320px` at 1024–1279, rail repositioned above grid as scrollable row at 768–1023, metrics `grid-cols-2` at <768
- [ ] 7.2 GREEN: Implement Tailwind responsive utilities in `Home.tsx` per design.md's Responsive Strategy table (`xl:grid-cols-[1fr_368px]`, `lg:grid-cols-[1fr_320px]`, `order-1`/`order-2` swap, `md:flex-row md:overflow-x-auto`)
- [ ] 7.3 Verify: `cd frontend && npx vitest run` — responsive tests pass

## Phase 8: Final Verification (tests)

- [ ] 8.1 Run `cd frontend && npx eslint .` — no new lint errors
- [ ] 8.2 Run `cd frontend && npx tsc --noEmit` — clean
- [ ] 8.3 Run `cd frontend && npx vitest run` — full suite green (except the 2 known pre-existing failures)
- [ ] 8.4 Run `cd backend && ./mvnw test` — full suite green
- [ ] 8.5 Manual spot-check: login, character-sheet, admin, create-character, create-campaign, view-campaign, demo screens render pixel-identical to before this change
