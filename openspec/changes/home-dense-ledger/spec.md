# Specification: Home Dashboard — "Dense Ledger"

**Change**: home-dense-ledger
**Date**: 2026-07-26
**Status**: proposed

## Purpose

Define the full behavioral and data contract for the redesigned home/dashboard
(`view === 'home'` in `App.tsx`): top bar shell, hero + metrics, character
cards grid, campaign rail, navigation, loading/error/empty states, responsive
behavior, and the backend count contract. Visual tokens (colors, spacing,
radii) are NOT restated here — see `design_handoff_home_dense_ledger/README.md`
and `design.md`. This is a new domain spec; no prior `home` spec exists.

## Requirements

### Requirement: Top Bar Navigation and Identity

The top bar MUST render only within the `home` view (as markup owned by
`Home.tsx`), NOT as a global shell wrapping every view. Every other page
(`Characters`, `ViewCampaign`, `CreateCampaign`, `AdminPanel`,
`CreateCharacter`) already renders its own `<header className="app-header">`
with its own `Logout` control; wrapping them with a second, different-looking
shell would either duplicate headers or require editing those pages, both of
which violate the hard constraint that no other screen's appearance changes
in this change. It MUST expose nav items `Home`, `Characters`, `Campaigns`,
and `Admin`. `Admin` MUST be visible only when `userRole === 'ROLE_ADMIN'`
(the existing `App.tsx` state variable); `Characters`/`Campaigns` MUST NOT
navigate to a distinct `view` — there is no such view in the current `View`
union — they MAY scroll to their section within the home view at ≥768px and
MUST be inert (no-op) below that width in this change. `Home` MUST be marked
active when `view === 'home'`; `Admin` MUST be marked active when
`view === 'admin'` (clicking it still calls `setView('admin')` as today).
The search field MUST render with placeholder `Search or paste join code` and
MUST NOT be wired to any search logic (no filtering, no API call, no
suggestions) — it is visual-only in this change. The avatar MUST show the
uppercased first two characters of `user.username` (no separate first/last
name field exists). Logout MUST call the existing handler from
`utils/auth.ts` with no new logic.

#### Scenario: Top bar renders only on the home view
- GIVEN the user navigates from `home` to `view === 'character-sheet'`
- WHEN the character sheet renders
- THEN the "Dense Ledger" top bar is absent
- AND `Characters.tsx`'s own existing `<header className="app-header">` renders unchanged

#### Scenario: Admin nav item hidden for non-admin
- GIVEN `userRole` is `'ROLE_USER'`
- WHEN the top bar renders
- THEN the `Admin` nav item is absent from the DOM

#### Scenario: Search field never triggers behavior
- GIVEN the top bar is rendered
- WHEN the user types into the search field
- THEN no API call, filter, or navigation occurs

#### Scenario: Avatar initials from username
- GIVEN `user.username` is `"pancho"`
- WHEN the top bar renders
- THEN the avatar displays `"PA"`

### Requirement: Hero Greeting, Subtitle, and Actions

The hero MUST render `Welcome back, {firstName}` where `firstName` MUST be
derived from `user.username` (no `firstName` field exists on `User`). The
subtitle MUST follow this exact priority: (1) if the user is DM
(`GET /campaigns/mine` returns ≥1 campaign) → a message stating the DM table
count; (2) else if the user is a player of ≥1 campaign
(`GET /campaigns/as-player` returns ≥1 entry) → a player-context message; (3)
else (both empty) → an onboarding message. `+ New character` MUST call
`setView('create-character')`. `+ New campaign` MUST call
`setView('create-campaign')`.

#### Scenario: DM subtitle takes priority over player subtitle
- GIVEN the user has 1 campaign from `GET /campaigns/mine` and 2 from `GET /campaigns/as-player`
- WHEN the hero renders
- THEN the DM-priority subtitle is shown, not the player-only subtitle

#### Scenario: Onboarding subtitle when both are empty
- GIVEN `GET /campaigns/mine` and `GET /campaigns/as-player` both return `[]`
- WHEN the hero renders
- THEN the onboarding subtitle is shown
- AND both primary action buttons are still visible

#### Scenario: Primary actions navigate correctly
- GIVEN the hero is rendered
- WHEN the user clicks `+ New character`
- THEN `setView('create-character')` is called
- WHEN the user clicks `+ New campaign`
- THEN `setView('create-campaign')` is called

### Requirement: Metrics Bar (4 Tiles)

The metrics bar MUST render exactly 4 tiles in `repeat(4,1fr)` (tile 5,
next-session, is dropped per Plan B — no empty or `—` tile MAY be shown in
its place). Each tile MUST be derived via `useMemo`, never stored as its own
state. Tiles, in order:

| # | Label | Formula |
|---|-------|---------|
| 1 | `CAMPAIGNS` | count of distinct campaigns across `GET /campaigns/mine` ∪ `GET /campaigns/as-player` |
| 2 | `CHARACTERS` | length of `GET /users/{userId}/characters` response |
| 3 | `AS DUNGEON MASTER` | length of `GET /campaigns/mine` response |
| 4 | `PLAYERS AT YOUR TABLES` | sum of `playerCount` across all `GET /campaigns/mine` entries |

#### Scenario: Metrics bar always has 4 tiles
- GIVEN any combination of campaign/character data, including all-zero
- WHEN the metrics bar renders
- THEN exactly 4 tiles are present and none show `—` or is blank

#### Scenario: Players-at-your-tables sums only DM campaigns
- GIVEN the user is DM of 2 campaigns with `playerCount` 3 and 5
- WHEN tile 4 renders
- THEN it displays `8`

### Requirement: Character Cards Grid — Derivation Rules

Each `CharacterCard` MUST derive:
- **Ability highlight**: a score cell MUST be visually highlighted when `score >= 16`.
- **Level badge**: `Character`/`CharacterClass` carries NO `level` field — levels only
  exist in `LevelRecord` entries returned by the existing `GET /levels` endpoint
  (already consumed the same way by `Characters.tsx`, no new endpoint). The home MUST
  fetch `api.levels.findAll()` in parallel with characters and campaigns, group the
  result by `characterId`, and derive: single resolved class → `LV {level}`; multiple
  classes (>1 distinct `dndClass.id` for that character) → `LV {level1}/{level2}` in the
  order the classes appear in `character.characterClasses`. If a character has no
  matching level records, the badge MUST be omitted for that card (not `LV 0` or `LV -`).
- **Campaign name**: resolved via a `Map<campaignId, campaignName>` built from the fetched campaigns list; a `Character` carries only `campaign.id` for this purpose. If unresolved or the character has no campaign, the campaign line MUST read `Unassigned`.
- **AC**: `Character.characterStats` has no `ac`/`armorClass` field. AC MUST be derived
  client-side as unarmored AC: `10 + floor((DEX - 10) / 2)` using the character's
  Dexterity score from `abilityScores` — the same "client logic, no new data" pattern
  already used for the ability-highlight rule. This is an approximation, not a real
  armor calculation; it MUST NOT be presented as anything other than the card's AC figure.
- **AC/speed row**: MUST show only the derived AC and speed (no HP bar) — `Character.characterStats` has a single `hp: number` with no `currentHp`/`maxHp` split (Plan B). Speed MUST read `characterStats.velocities[0]` (the character's base walking speed; no unit conversion).
- **Subtitle**: MUST be exactly `{race} · {class}` with no subclass parenthetical (no `subclass` field exists in the repo).
- **Filter**: `all` / `active` / `retired`. No `active`/`retired`/`status` field exists on `Character` anywhere in the codebase. In the absence of that field, ALL characters MUST be treated as `active`: selecting `retired` MUST render the empty-grid state (only `CreateCharacterCTA`), and `all`/`active` MUST render identical results. This is a forced Plan-B-style assumption, not an invented backend field.
- **Sort**: `recent` (default, most-recently-touched order as returned by the API) / `level` (descending) / `name` (ascending, case-insensitive).
- **Persistence**: `filter` MUST persist to `localStorage` key `home.filter`; `sort` MUST persist to `localStorage` key `home.sort`. On mount, both MUST be read from `localStorage` before first render of the grid, falling back to `all`/`recent` if absent or invalid.

#### Scenario: Multiclass level badge
- GIVEN a character has two `characterClasses` entries and `GET /levels` returns
  matching `LevelRecord`s of `level: 3` for the first class and `level: 2` for the second
- WHEN the card renders
- THEN the level badge reads `LV 3/2`

#### Scenario: Level badge omitted when no level records match
- GIVEN a character's id has no matching entries in `GET /levels`
- WHEN the card renders
- THEN no level badge is shown (not `LV 0`, not a blank badge)

#### Scenario: AC derived from Dexterity
- GIVEN a character's Dexterity score is `14`
- WHEN the card's AC/speed row renders
- THEN it shows AC `12` (`10 + floor((14 - 10) / 2)`)

#### Scenario: Ability score highlight threshold
- GIVEN a character's Strength score is `16`
- WHEN the ability strip renders
- THEN the Strength cell is highlighted
- GIVEN a character's Strength score is `15`
- THEN the Strength cell is NOT highlighted

#### Scenario: Unassigned campaign
- GIVEN a character's `campaign.id` does not match any entry in the resolved campaign `Map`
- WHEN the card renders
- THEN the campaign line reads `Unassigned` with the player-color dot

#### Scenario: Retired filter yields empty grid
- GIVEN the user has 3 characters and no character has any retired concept
- WHEN the user selects the `Retired` filter
- THEN the grid shows 0 character cards and the `CreateCharacterCTA` full-width empty state

#### Scenario: Filter and sort persist across navigation
- GIVEN the user sets `sort` to `level` and `filter` to `active`
- WHEN the user opens a character sheet and returns to home
- THEN the grid still shows `sort=level`, `filter=active`
- AND `localStorage.home.sort === 'level'` and `localStorage.home.filter === 'active'`

### Requirement: Campaign Rail — Card Variants and Role Logic

The featured variant MUST be selected for the first campaign in the list
where the user is DM (`GET /campaigns/mine` entries take variant priority);
if the user is DM of none, the first campaign overall (from either endpoint)
MUST use the normal variant only — no featured card is forced. All other
campaigns MUST use the normal variant. The role chip MUST read `DM` for
campaigns sourced from `GET /campaigns/mine` and `PLAYER` for campaigns
sourced from `GET /campaigns/as-player`; role MUST NOT be read from
`CampaignDto.dm` (`@JsonIgnore`, unavailable). The meta line MUST NOT include
a `Session N` segment (no `sessionNumber` field exists) — it MUST show only
player/character counts, e.g. `{playerCount} players · {characterCount} of
your heroes`. Join code MUST be visible only when the role is `DM`.
`playerCount` and `characterCount` MUST be read directly from
`CampaignSummaryDto`/`PlayerCampaignSummaryDto` (new fields — see Backend
Contract) and MUST NOT be recomputed client-side. The `Join a table` input
MUST uppercase all typed characters and MUST insert a hyphen immediately
after the 4th character while typing (matching placeholder format
`A3F9-B72C`).

#### Scenario: Role chip and join-code visibility for DM
- GIVEN a campaign is present in `GET /campaigns/mine`
- WHEN its rail card renders
- THEN the role chip reads `DM`
- AND the join code block is visible

#### Scenario: Role chip and join-code hidden for player
- GIVEN a campaign is present only in `GET /campaigns/as-player`
- WHEN its rail card renders
- THEN the role chip reads `PLAYER`
- AND the join code block is absent

#### Scenario: Counts match ViewCampaign for the same campaign
- GIVEN campaign `42` shows `playerCount: 5` and `characterCount: 2` on `ViewCampaign.tsx`
- WHEN campaign `42` appears in the home rail (as DM or player)
- THEN the rail meta line shows the same `5` and `2` values

#### Scenario: Join code input auto-formatting
- GIVEN the `Join a table` input is empty
- WHEN the user types `a3f9b72c`
- THEN the input value is `A3F9-B72C`

### Requirement: Navigation Contract (State-Based, No Router)

The following click targets MUST trigger exactly the listed state transition,
with no route library involved:

| Element | Action |
|---|---|
| `+ New character` / `Open creator →` | `setView('create-character')` |
| `+ New campaign` / rail `+` | `setView('create-campaign')` |
| `Open sheet →` or anywhere on a `CharacterCard` | `setView('character-sheet')` + set the selected character id |
| `Open table` / `Open →` / campaign name in rail | `setView('view-campaign')` + set the selected campaign id |
| `Manage` | same as `Open table`, DM-only, visible only for the DM role |
| `Logout` | existing `utils/auth.ts` handler |

#### Scenario: Card click navigates to character sheet
- GIVEN a `CharacterCard` for character id `7`
- WHEN the user clicks anywhere on the card (not the `···` menu)
- THEN `setView('character-sheet')` is called with the selected id set to `7`

### Requirement: Loading, Error, and Empty States

On mount, the home MUST fetch character and campaign data in parallel and
MUST show a `loading` status until both resolve. While `loading`, the grid
MUST render exactly 4 skeleton character cards and the rail MUST render
exactly 3 skeleton rail cards, matching real card geometry (no centered
spinner). On fetch failure, the home MUST show a full-width error band below
the hero with a `Retry` action; `alert()` MUST NOT be used. Empty states:
zero characters → `CreateCharacterCTA` full-width in the grid; zero campaigns
→ a single dashed empty card in the rail while the `Join a table` block
remains visible; zero of both → the hero's onboarding subtitle and both
primary actions render with no other body content beyond the two empty-state
placeholders.

#### Scenario: Loading skeleton counts
- GIVEN the initial fetch has not resolved
- WHEN the home mounts
- THEN 4 skeleton character cards and 3 skeleton rail cards render

#### Scenario: Error band with retry, no alert
- GIVEN `Promise.all([api.characters.findByUserId, api.campaigns...])` rejects
- WHEN the error is caught
- THEN an error band renders below the hero with a `Retry` control
- AND `window.alert` is never called

#### Scenario: Zero characters
- GIVEN the user has 0 characters
- WHEN the grid renders
- THEN only the full-width `CreateCharacterCTA` (0-state copy) is shown

#### Scenario: Zero campaigns
- GIVEN the user has 0 campaigns (DM and player)
- WHEN the rail renders
- THEN a single dashed `No tables yet` card is shown
- AND the `Join a table` input block is still visible and usable

#### Scenario: Zero of everything
- GIVEN the user has 0 characters and 0 campaigns
- WHEN the home renders
- THEN the hero shows the onboarding subtitle and both primary actions
- AND the grid and rail show their respective empty states, nothing else

### Requirement: Responsive Contract

| Breakpoint | Behavior |
|---|---|
| `≥ 1280px` | Documented layout: `1fr / 368px` body grid, 2-column character grid, metrics `repeat(4,1fr)` |
| `1024–1279px` | Rail column width MUST become `320px`; character grid MUST remain 2 columns |
| `768–1023px` | Body MUST become a single column; the campaign rail MUST move above the character grid as a horizontally scrollable row of `280px` cards; character grid MUST remain 2 columns |
| `< 768px` | Everything MUST stack to 1 column; metrics bar MUST become `grid-template-columns: repeat(2, 1fr)`; the ability score strip MUST remain 6 columns; all clickable action targets MUST have a minimum hit area of `44px` |

#### Scenario: Rail repositioning on tablet width
- GIVEN the viewport width is `900px`
- WHEN the home renders
- THEN the campaign rail appears above the character grid as a scrollable row

#### Scenario: Mobile metrics grid
- GIVEN the viewport width is `600px`
- WHEN the metrics bar renders
- THEN it uses 2 columns, not 4

### Requirement: Backend Count Contract

`GET /campaigns/mine` (`CampaignSummaryDto`) and `GET /campaigns/as-player`
(`PlayerCampaignSummaryDto`) MUST additionally return `playerCount` (integer)
and `characterCount` (integer) per campaign. Both fields MUST be computed via
a single reusable `CampaignService` method extracted from
`CampaignController`'s existing `mapToDetail` union logic: explicit
`campaign_players` join-table rows UNIONED with users derived from
`characters[].user`, deduped by user id, for `playerCount`; distinct
`characters` entries for `characterCount`. The list endpoints MUST NOT
reimplement or approximate this logic (e.g. `players.size()` alone is
INSUFFICIENT and MUST NOT be used).

#### Scenario: DM-owned character without a join-table row still counts
- GIVEN campaign `9` has a DM who owns 1 character but has no row in `campaign_players`
- AND campaign `9` has 2 other explicit `campaign_players` rows
- WHEN `GET /campaigns/mine` returns campaign `9`
- THEN `playerCount` is `3` (2 explicit rows + the DM counted via their character)

#### Scenario: Parity with campaign detail view
- GIVEN campaign `9` returns `playerCount: 3`, `characterCount: 2` from `GET /campaign/9`
- WHEN campaign `9` appears in `GET /campaigns/mine` or `GET /campaigns/as-player`
- THEN it reports the same `playerCount: 3`, `characterCount: 2`

### Requirement: Hard Constraints

The implementation MUST NOT introduce `react-router` or any router library;
navigation MUST remain `setView(...)` state in `App.tsx`. The implementation
MUST NOT add an icon library; glyphs MUST remain geometric placeholders or
text characters. The implementation MUST NOT add a component library.
`CampaignDto.dm` (`@JsonIgnore`) MUST NOT be read directly to determine role
anywhere in the frontend; role MUST always come from endpoint source
(`/campaigns/mine` vs `/campaigns/as-player`) or an explicit prop. New
`--home-*` design tokens MUST NOT redefine or alter the values of any
existing `--color-*` token, and MUST NOT change the rendered appearance of
login, character sheet, admin, create-character, create-campaign,
view-campaign, or demo screens.

#### Scenario: Other screens unaffected by new tokens
- GIVEN the `--home-*` tokens and `@font-face` rules are added to `index.css`
- WHEN any non-home screen (e.g. `ViewCampaign`) renders
- THEN its computed styles are unchanged from before this change

#### Scenario: No new dependencies introduced
- GIVEN the change is complete
- WHEN `package.json` is inspected
- THEN no router, icon library, or UI component library has been added
