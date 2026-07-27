# Design: Home Redesign — "Dense Ledger"

**Change**: home-dense-ledger
**Date**: 2026-07-26
**Status**: designed

---

## Technical Approach

Extract the inline home body from `App.tsx` into a presentational `src/pages/Home.tsx`
(project convention: "container-view pattern in App.tsx, page components in src/pages/").
`App.tsx` keeps ALL state, data-loading, and handlers; `Home.tsx` and the three new card
components are pure props+callbacks. Backend gains a reusable union-count method on
`CampaignService`, surfaced as `playerCount`/`characterCount` on both list DTOs. Design
tokens are added under Tailwind's `--color-home-*` / `--font-home-*` / `--radius-home-*`
namespaces (collision-free with the existing global `@theme`), plus self-hosted `@font-face`.

---

## Architecture Decisions

### ADR-01: Extract home body to `src/pages/Home.tsx` (not kept inline)

**Choice**: New presentational `src/pages/Home.tsx` rendered from `App.tsx`'s default branch.
**Alternatives**: Keep ~550 lines of restructured JSX inline in `App.tsx` (proposal's literal wording).
**Rationale**: Convention rule `rules.design`/`rules.apply` + `context` state pages live in
`src/pages/` and must be pure presentational (see `Characters.tsx`, `ViewCampaign.tsx`). `App.tsx`
is already 1343 lines; inlining the new body worsens it and hurts reviewability (the proposal's own
stated goal). The proposal's "replace the inline body" describes the outcome (old body gone), which
extraction satisfies. `Home.tsx` receives data + callbacks; `App.tsx` stays the container.

### ADR-02: Top bar is home-scoped, not an app-wide shell

**Choice**: Render the top bar as markup inside `Home.tsx` only.
**Alternatives**: Wrap every authenticated view with a global `<TopBar>` in `App.tsx` (proposal item 1).
**Rationale**: Every other page (`Characters`, `ViewCampaign`, `CreateCampaign`, `AdminPanel`,
`CreateCharacter`) already renders its own header and takes `onLogout`. Wrapping them with a second
shell WOULD change their appearance, violating the hard "other screens stay pixel-identical"
constraint (proposal §Confirmed Scope, handoff Out-of-scope). Home-scoping honors that constraint;
hoisting to a true global shell is deferred to a later change that also removes per-page headers.

### ADR-03: Namespace tokens under `--color-home-*`, not flat `--home-*`

**Choice**: `--color-home-surface`, `--color-home-border`, `--font-home-display`, `--radius-home-lg`, …
**Alternatives**: Flat `--home-surface` (proposal's literal example); reuse existing `--color-*` (forbidden).
**Rationale**: Tailwind 4 only auto-generates utilities (`bg-home-surface`, `border-home-border`,
`text-home-blue-400`) for variables under its known namespaces (`--color-*`, `--font-*`,
`--radius-*`, `--spacing-*`). A flat `--home-surface` generates NO utility and forces raw
`var()`/arbitrary values everywhere. The `home` infix still guarantees zero collision with the
existing `--color-surface`/`--color-border` tokens and the global `* { border-color }` reset —
satisfying the proposal's hard constraint while keeping the handoff's "use generated utilities" rule.

### ADR-04: Keep per-list loading/error state; derive aggregate `status`

**Choice**: Retain existing `loadingCharacters/loadingCampaigns/…` + `*Error` flags and their
request-id race guards; derive `status: 'loading' | 'ready' | 'error'` via `useMemo`.
**Alternatives**: Replace all flags with the handoff's single `status` state.
**Rationale**: The existing per-list machinery has working stale-response race guards
(`latest*RequestId` refs). Ripping it out to satisfy the handoff's simplified shape risks
regressions for zero benefit. The home only needs an aggregate for the skeleton/error band, which
is cleanly derivable.

### ADR-05: `isDungeonMaster` derived from endpoint source, never from a `dm` field

**Choice**: Role comes from which list a campaign originated in (`/campaigns/mine` = DM,
`/campaigns/as-player` = player), passed as an explicit prop/tag.
**Rationale**: `CampaignDto.dm` is `@JsonIgnore` (confirmed in code); the backend never exposes DM
identity. Same constraint as archived `view-campaign` ADR-01.

---

## App.tsx State Management

**Already present (reused):** `characters` (see gotcha below), `campaigns: OwnedCampaignSummary[]`,
`playerCampaigns: PlayerCampaignSummary[]`, `publicCampaigns`, all `loading*`/`*Error` flags,
`selectedCharacterId`, `selectedCampaignId`, `userRole`, plus all existing handlers
(`handleOpenCreateCharacter`, `handleOpenCreateCampaign`, `handleViewCharacter`, `handleViewCampaign`,
`handleLogout`, `handleRequestDeleteCharacter`).

**New state to ADD (only these three):**

```typescript
const [filter, setFilter] = useState<'all' | 'active' | 'retired'>(
  () => (localStorage.getItem('home.filter') as 'all'|'active'|'retired') ?? 'all')
const [sort, setSort] = useState<'recent' | 'level' | 'name'>(
  () => (localStorage.getItem('home.sort') as 'recent'|'level'|'name') ?? 'recent')
const [joinCode, setJoinCode] = useState('')
```

`filter`/`sort` persist via `useEffect(() => localStorage.setItem('home.filter', filter), [filter])`
(same for `sort`). `joinCode` is not persisted. `status` is derived (ADR-04), NOT new state.

**GOTCHA — name collision:** `App.tsx` line 24 declares a LOCAL `interface CharacterCard`
(minimal: `id, name?, level?, alignment?, race?.name`). Importing the new
`components/CharacterCard.tsx` component will collide. Resolution: DELETE the local interface and
type `characters` as `Character[]` (the real payload — `api.characters.findByUserId` already returns
`Character[]`), which the new card requires anyway for ability scores / stats / campaign.

### Derived values (all `useMemo`, per convention "metrics are derived, never own state")

```typescript
// Campaign name resolution Map (handoff State Management)
const campaignNameById = useMemo(() => {
  const m = new Map<number, string>()
  campaigns.forEach(c => m.set(c.id, c.name))
  playerCampaigns.forEach(pc => m.set(pc.campaignId, pc.campaignName))
  return m
}, [campaigns, playerCampaigns])

// Unified rail view model (tags DM vs PLAYER, dedupes player rows by campaignId)
const railCampaigns = useMemo<RailCampaign[]>(() => { /* see Interfaces */ }, [campaigns, playerCampaigns])

// 4 metric tiles (tile 5 dropped per Plan B → repeat(4,1fr))
const metrics = useMemo(() => {
  const dmIds = new Set(campaigns.map(c => c.id))
  const playerIds = new Set(playerCampaigns.map(pc => pc.campaignId))
  return {
    campaignsCount: new Set([...dmIds, ...playerIds]).size,       // CAMPAIGNS
    charactersCount: characters.length,                            // CHARACTERS
    asDmCount: campaigns.length,                                   // AS DUNGEON MASTER (blue)
    playersAtTables: campaigns.reduce((s, c) => s + (c.playerCount ?? 0), 0), // PLAYERS AT YOUR TABLES
  }
}, [characters, campaigns, playerCampaigns])
```

---

## Component Interfaces

```typescript
// components/CharacterCard.tsx (NEW) — presentational
interface CharacterCardProps {
  character: Character
  campaignName: string | null          // from campaignNameById; null → "Unassigned"
  isDungeonMaster: boolean             // dot color: true=home-blue-500, false=home-dim
  onOpenSheet: (characterId: number) => void
  onRequestDelete?: (characterId: number, name?: string) => void  // "···" menu
}

// components/CampaignRailCard.tsx (NEW) — presentational
type RailCampaign = {
  id: number; name: string; role: 'DM' | 'PLAYER'
  joinCode?: string          // shown ONLY when role==='DM'
  playerCount?: number; characterCount?: number
  heroName?: string          // player's character name (normal PLAYER variant left slot)
}
interface CampaignRailCardProps {
  campaign: RailCampaign
  featured?: boolean         // gradient + full action row
  onOpen: (campaignId: number) => void
  onManage?: (campaignId: number) => void   // DM-only "Manage"
}

// components/MetricTile.tsx (NEW) — presentational
interface MetricTileProps {
  value: string | number
  label: string
  valueClassName?: string    // e.g. "text-home-blue-400" for the DM tile
}

// components/scoreBox.tsx — ADD export, existing ScoreBox untouched (additive)
interface AbilityScoreStripProps {
  abilityScores: AbilityScores           // fixed order STR DEX CON INT WIS CHA
}
export function AbilityScoreStrip(props: AbilityScoreStripProps): JSX.Element
// value highlighted (text-home-blue-300) when score >= 16 (client logic, no new data)

// components/CopyCodeButton.tsx — widen size union (additive)
size?: 'xs' | 'sm' | 'md'    // 'xs' → dimension 12px (0.75rem), iconSize 10; 'sm'/'md' unchanged
```

`Home.tsx` receives: `characters`, `railCampaigns`, `campaignNameById`, `metrics`, `status`,
`filter`, `sort`, `joinCode`, `userRole`, `username`, and callbacks (`onOpenCreateCharacter`,
`onOpenCreateCampaign`, `onOpenSheet`, `onOpenCampaign`, `onManageCampaign`, `onRequestDeleteCharacter`,
`onFilterChange`, `onSortChange`, `onJoinCodeChange`, `onJoinSubmit`, `onOpenAdmin`, `onLogout`).

---

## Backend Design

**Extract union logic from `CampaignController.mapToDetail()` into `CampaignService`:**

```java
// CampaignService.java (NEW methods)
@Transactional(readOnly = true)
public List<UserEntity> resolveUniquePlayers(CampaignEntity campaign) {
  // exact logic currently in CampaignController.mapToDetail (lines 138-157):
  // explicit campaign_players rows, then character owners not already present, deduped by id
}
public int countUniquePlayers(CampaignEntity campaign) { return resolveUniquePlayers(campaign).size(); }
public int countCharacters(CampaignEntity campaign) {
  return campaign.getCharacters() == null ? 0 : campaign.getCharacters().size();
}
```

- `mapToSummary(...)` (line 161) sets `dto.setPlayerCount(countUniquePlayers(e))` and
  `dto.setCharacterCount(countCharacters(e))`. It is already called inside
  `findOwnedCampaignSummaries` which is `@Transactional(readOnly = true)`, so the lazy
  `players`/`characters` collections are reachable.
- `findPlayerCampaignSummaries(...)` (line 137) sets the same two counts per row via
  `character.getCampaign()` (reachable inside the existing `@Transactional`). Multiple characters in
  one campaign repeat the per-campaign counts — the frontend dedupes by `campaignId`.
- **Parity guarantee:** refactor `CampaignController.mapToDetail` to build its player list from
  `campaignService.resolveUniquePlayers(entity)` so detail `players.size()` === list `playerCount`
  for the same campaign (the extraction's whole purpose).

**DTO changes (additive):** `CampaignSummaryDto` and `PlayerCampaignSummaryDto` each gain
`private Integer playerCount;` and `private Integer characterCount;` with getters/setters.
TS mirrors: `OwnedCampaignSummary` and `PlayerCampaignSummary` gain
`playerCount?: number; characterCount?: number`.

---

## Design Tokens & Fonts (`frontend/src/index.css`, appended — existing `@theme` untouched)

Add a SECOND `@theme` block mapping every handoff hex to a `--color-home-*` name (do not touch the
existing block or the `* { border-color }` reset):

```css
@theme {
  /* surfaces */         --color-home-ink-900:#0a0b0d; --color-home-ink-850:#0b0d11;
  --color-home-ink-800:#0c0e12; --color-home-surface:#0e1116; --color-home-surface-in:#0d1116;
  --color-home-well:#0a0d12;
  /* borders */          --color-home-line:#191d24; --color-home-line-soft:#171c24;
  --color-home-border:#1c2028; --color-home-border-mid:#22272f; --color-home-border-hi:#2a3546;
  --color-home-border-acc:#24374f; --color-home-border-dash:#26303f;
  /* text */             --color-home-text:#e8ecf2; --color-home-text-strong:#ffffff;
  --color-home-text-soft:#cdd6e3; --color-home-muted:#8b94a3; --color-home-muted-2:#7f8899;
  --color-home-dim:#6b7480; --color-home-dim-2:#606a7a; --color-home-dim-3:#5c6573;
  --color-home-placeholder:#4b5563;
  /* accents */          --color-home-blue-600:#2563eb; --color-home-blue-500:#3b82f6;
  --color-home-blue-400:#60a5fa; --color-home-blue-300:#7cb0f7; --color-home-blue-200:#a8c8f8;
  --color-home-blue-ink:#1b2942; --color-home-chip:#1a2130; --color-home-gold:#f0b429;
  --color-home-warn:#f59e0b; --color-home-warn-deep:#b45309; --color-home-danger:#f87171;
  /* type */             --font-home-display:'Space Grotesk',system-ui,sans-serif;
  --font-home-mono:'JetBrains Mono',ui-monospace,monospace;
  /* radii */            --radius-home-sm:5px; --radius-home-md:6px; --radius-home-lg:7px;
  --radius-home-xl:9px; --radius-home-2xl:10px; --radius-home-3xl:11px;
}
```

Gradients (card/hero/tile) and the one primary-button shadow are exact px/rgba → apply as inline
`style` or arbitrary utilities (`bg-[linear-gradient(...)]`); odd px spacings (13/15/17.5) use
arbitrary values (`p-[13px]`). Tabular numbers: `font-variant-numeric: tabular-nums` on all mono figures.

**`@font-face`** blocks in `index.css` (8 total), files in `frontend/public/fonts/` (Vite serves at `/`):

```css
@font-face{font-family:'Space Grotesk';font-weight:400;font-display:swap;
  src:url('/fonts/space-grotesk-400.woff2') format('woff2')}
/* …500/600/700 for Space Grotesk; 400/500/600/700 for JetBrains Mono (jetbrains-mono-*.woff2) */
```

---

## Responsive Strategy (Tailwind 4 utilities — bands map cleanly to md/lg/xl)

Default breakpoints already match the handoff: `md`=768, `lg`=1024, `xl`=1280. Mobile-first, no
custom media queries.

| Band | Utilities |
|------|-----------|
| ≥1280 | `xl:grid-cols-[1fr_368px]` (body), metrics `xl:grid-cols-4` |
| 1024–1279 | `lg:grid-cols-[1fr_320px]`, metrics `lg:grid-cols-4` |
| 768–1023 | base `grid-cols-1`; rail moves above characters + horizontal scroll |
| <768 | `grid-cols-1`; metrics `grid-cols-2`; ability strip stays 6 cols; 44px hit targets |

**DOM-order vs visual-order swap (768–1023):** body is a grid with two children in DOM order
[characters, rail] (correct for desktop left/right). Below `lg`, apply CSS `order`:
characters `order-2 lg:order-none`, rail `order-1 lg:order-none`. Rail inner container switches axis:
`flex flex-col md:flex-row md:overflow-x-auto lg:flex-col`; rail cards `md:min-w-[280px] lg:min-w-0`.
This puts the rail above characters as a horizontal-scroll strip only in the md band, restoring the
368/320px right column at `lg+`.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/pages/Home.tsx` | Create | Presentational home: top bar + hero/metrics + two-column body; all props+callbacks. |
| `frontend/src/App.tsx` | Modify | Delete local `CharacterCard` interface; type `characters` as `Character[]`; add `filter`/`sort`/`joinCode` state (+localStorage), `campaignNameById`/`railCampaigns`/`metrics`/`status` memos, `handleJoinByCode`; replace inline home body (684–1235) with `<Home …/>`. |
| `frontend/src/index.css` | Modify | Append 2nd `@theme` (`--color-home-*`/`--font-home-*`/`--radius-home-*`) + 8 `@font-face` rules. |
| `frontend/src/components/CharacterCard.tsx` | Create | Mini character sheet card (name/level badge, subtitle, campaign dot line, `AbilityScoreStrip`, AC+speed row, footer). |
| `frontend/src/components/CampaignRailCard.tsx` | Create | Featured + normal variants; DM join code + Open/Manage; player hero name + Open. |
| `frontend/src/components/MetricTile.tsx` | Create | Number + uppercase label tile; optional value color. |
| `frontend/src/components/scoreBox.tsx` | Modify | Add `AbilityScoreStrip` export (compact read-only STR–CHA); existing `ScoreBox` unchanged. |
| `frontend/src/components/CopyCodeButton.tsx` | Modify | Add `'xs'` (12px) to size union; existing sizes/behavior unchanged. |
| `frontend/src/interfaces/campaign.ts` | Modify | Add `playerCount?`/`characterCount?` to `OwnedCampaignSummary` and `PlayerCampaignSummary`. |
| `frontend/public/fonts/*.woff2` | Create | 8 self-hosted woff2 (latin subset). |
| `CampaignService.java` | Modify | Add `resolveUniquePlayers`/`countUniquePlayers`/`countCharacters`; set counts in both summary mappers. |
| `CampaignController.java` | Modify | `mapToDetail` uses `campaignService.resolveUniquePlayers` for parity. |
| `CampaignSummaryDto.java` / `PlayerCampaignSummaryDto.java` | Modify | Add `Integer playerCount`, `Integer characterCount` + accessors. |

---

## Testing Strategy (strict TDD — `cd frontend && npx vitest run`)

| Layer | What | Approach |
|-------|------|----------|
| Unit | metrics/campaignNameById/railCampaigns memos; ability-highlight (≥16); AC derivation; level badge (incl. `LV 3/2`); join-code auto-format (uppercase + dash after 4th) | pure-function/component tests |
| Component | CharacterCard, CampaignRailCard (both variants), MetricTile, AbilityScoreStrip, CopyCodeButton `xs`, Home states (loading skeletons, error band+Retry, empty) | @testing-library/react |
| Backend | count parity: DM who owns a character but is NOT in `campaign_players` still counted; list `playerCount` === detail `players.size()` | JUnit + H2 |

---

## Open Questions — resolved in spec.md

- [x] **AC has no backing field.** Resolved: derive unarmored AC = `10 + floor((DEX-10)/2)`
  client-side from `abilityScores`, same pattern as the ability-highlight rule. See
  spec.md "Character Cards Grid — Derivation Rules".
- [x] **Character level source.** Confirmed via `frontend/src/interfaces/character.ts`:
  `Character`/`CharacterClass` has NO `level` field at all. Levels only exist in
  `LevelRecord`s from the existing `GET /levels` endpoint (`api.levels.findAll()`),
  the same endpoint `Characters.tsx` already calls and joins by `characterId` client-side
  — no new endpoint needed. `App.tsx` MUST add this as a THIRD parallel fetch alongside
  characters and campaigns (`Promise.all([characters, campaigns.mine, campaigns.asPlayer, levels.findAll])`);
  group by `characterId` for the badge. Omit the badge when no records match.
- [x] Speed source: `characterStats.velocities[0]`, no unit conversion. Confirmed in spec.md.

## Revised: parallel fetch includes levels

Section "App.tsx State Management" above lists `characters`/`campaigns`/`playerCampaigns`
as already-present state. Add: the mount-time fetch MUST also call `api.levels.findAll()`
in the same `Promise.all`, and a new `useMemo` MUST group the result into
`levelsByCharacterId: Map<number, LevelRecord[]>` for `CharacterCard`'s level-badge derivation.
