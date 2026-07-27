# Design: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Date**: 2026-07-27
**Status**: designed
**Input**: `openspec/changes/restyle-demo-landing/proposal.md` (approved, no changes)

---

## 1. Architecture Overview

### Pattern

Presentational-component reuse with a **static data module**. `DemoLanding` becomes a pure
render function over module-level constants — no state, no effects, no async. The same
Dense Ledger leaf components that `Home.tsx` composes (`CharacterCard`, `CampaignRailCard`,
`MetricTile`, `AbilityScoreStrip` transitively) are composed again by `DemoLanding` in a
reduced shell.

```
                        ┌──────────────────┐
                        │  App.tsx         │  routing only
                        └────────┬─────────┘
                  isAuthenticated│
              ┌─────────────false┴true──────────────┐
              ▼                                     ▼
    ┌───────────────────┐                 ┌───────────────────┐
    │ DemoLanding.tsx   │                 │ Home.tsx          │
    │ (static)          │                 │ (data-driven)     │
    │ props: 1 callback │                 │ props: ~25        │
    └─────────┬─────────┘                 └─────────┬─────────┘
              │  interactive={false}                │  (default true)
              └──────────────┬──────────────────────┘
                             ▼
            ┌────────────────────────────────────┐
            │ CharacterCard · CampaignRailCard   │  shared presentational layer
            │ MetricTile (already inert)         │  ← single source of visual truth
            └────────────────────────────────────┘
                             ▲
                             │ module constants (typed)
            ┌────────────────┴───────────────────┐
            │ DEMO_CAMPAIGN: RailCampaign        │
            │ DEMO_CHARACTERS: Character[]       │
            │ DEMO_LEVELS: Map<number, LevelRecord[]> │
            └────────────────────────────────────┘
```

### Layering / boundaries

| Layer | Rule |
|---|---|
| `pages/DemoLanding.tsx` | Owns the landing shell + the showcase constants. Imports leaf components only. **MUST NOT** import `Home.tsx` (a full authenticated page with 25 required props and auth-only concepts) nor `services/api`. |
| `components/*` | Stay presentational and prop-driven. Gain one additive boolean; no knowledge of "demo" as a concept — the prop is named `interactive`, not `demo`. |
| `App.tsx` | Routing/state only. Loses two callbacks and the two dead demo-navigation branches. |

**Key boundary decision**: the shared components learn about *interactivity*, never about
*the landing*. That keeps the components reusable for any future read-only surface
(printable sheet, embed, screenshot fixture) without a second flag.

---

## 2. ADR-01 — `interactive?: boolean` on the two card components

**Decision**: additive optional prop, default `true`, on `CharacterCard` and
`CampaignRailCard`. Rejected: local duplicated `DemoCharacterCard`/`DemoCampaignCard`
(Option B in the proposal) — it clones ~40 long Tailwind class strings that will silently
drift on the next restyle, defeating the entire purpose of this change.

**Invariant that gates the whole change**: with `interactive` omitted, the rendered tree
must be byte-identical to today's. Every existing call site (`Home.tsx`, both component
test files) is therefore a no-op change and needs zero edits.

### 2.1 `CharacterCard.tsx`

Prop contract:

```ts
export interface CharacterCardProps {
  character: Character
  campaignName: string | null
  isDungeonMaster: boolean
  /** Required only in interactive mode; ignored when interactive === false. */
  onOpenSheet?: (characterId: number) => void
  onRequestDelete?: (characterId: number, name?: string) => void
  levelsByCharacterId: Map<number, LevelRecord[]>
  /** Default true. When false the card is inert: no role/tabIndex/handlers, no footer row. */
  interactive?: boolean
}
```

`onOpenSheet` goes from required to optional. This is a **widening** of the accepted prop
shape — every existing caller still type-checks. Internally it is invoked as
`onOpenSheet?.(character.id)` so an interactive card without the callback degrades to a
no-op instead of throwing.

Prop threading, exactly:

| Element (current line) | `interactive === true` | `interactive === false` |
|---|---|---|
| outer `<div>` (L61) | `role="button"` | attribute absent |
| outer `<div>` (L63) | `tabIndex={0}` | attribute absent |
| outer `<div>` (L64) | `onClick` | `undefined` |
| outer `<div>` (L65-69) | `onKeyDown` | `undefined` |
| outer `<div>` className (L70) | `cursor-pointer … transition-colors … hover:border-home-border-hi` | same string **minus** `cursor-pointer` and `hover:border-home-border-hi` |
| footer row (L114-127) — border-t + `Open sheet →` + `···` | rendered | **not rendered at all** |

Implementation shape (conditional spread keeps the attributes truly absent, not
`role={undefined}` noise):

```tsx
const interactiveProps = interactive
  ? {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => onOpenSheet?.(character.id),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenSheet?.(character.id)
      },
    }
  : {}
```

**Accepted tradeoff**: dropping the footer row shortens the card by ~35px versus Home's
card. The alternative — keeping the `border-t` divider with an empty row — reads as a
rendering bug. Since the landing never appears beside Home, the at-rest body of the card
(title, level badge, campaign dot, ability strip, AC/FT) is pixel-identical, which is what
"visually indistinguishable in style" means here.

### 2.2 `CampaignRailCard.tsx`

Prop contract:

```ts
export interface CampaignRailCardProps {
  campaign: RailCampaign
  featured?: boolean
  /** Required only in interactive mode. */
  onOpen?: (campaignId: number) => void
  onManage?: (campaignId: number) => void
  /** Default true. When false: name is a span, no action row, no copy button. */
  interactive?: boolean
}
```

| Element (current line) | `interactive === true` | `interactive === false` |
|---|---|---|
| name `<button>` (L34-40) | `<button type="button" onClick={() => onOpen?.(id)}>` | `<span>` with the **same className**, no handler |
| role chip (L41-49) | rendered | rendered (inert `<span>` already) |
| meta line (L52) | rendered | rendered |
| join-code block (L54-62) | rendered incl. `<CopyCodeButton>` | rendered **without** `<CopyCodeButton>` — the code text and its container survive |
| featured action row (L65-82) — `Open table` / `Manage` | rendered | **not rendered** |
| normal footer row (L84-97) | left slot + `Open →` button | left slot only, `Open →` **not rendered** |

`CopyCodeButton` is excluded because it is a focusable `<button>` inside the card, and the
success criterion is "cards expose no clickable/focusable affordance". Keeping the JOIN
CODE well itself is deliberate: it is the single most product-specific visual on the rail
and its absence would flatten the featured variant.

The name switching element type (`button` → `span`) is safe: both are flex items in the
same `justify-between` row, Tailwind's preflight already strips the button's UA font
styling, and the className is shared verbatim.

### 2.3 Why the default is `true` and not `false`

`true` makes the change purely additive at every existing call site. A default of `false`
would silently kill Home's interactivity for any caller that forgot the prop — a
production regression traded for a cosmetic gain on one page.

---

## 3. ADR-02 — Hardcoded showcase data

**Decision**: three module-level `const` declarations at the top of `DemoLanding.tsx`,
explicitly typed against the real domain interfaces. Rejected: a separate
`fixtures/demoLanding.ts` module (indirection with a single consumer) and reusing
`interfaces/demo.ts` DTOs (`DemoCharacterSummary` is a flat summary — it cannot feed
`CharacterCard`, which needs `characterStats.abilityScores`, `race`, `characterClasses`).

Typing them as `Character` / `RailCampaign` rather than inferring literals is the whole
safety mechanism: `tsc --noEmit` breaks loudly if the domain interfaces ever change.

### 3.1 Data shape

```ts
const DEMO_CAMPAIGN: RailCampaign = {
  id: 9001,
  name: 'The Sunken Crown',
  role: 'DM',
  joinCode: 'A3F9-B72C',
  playerCount: 4,
  characterCount: 3,
}
```

`role: 'DM'` + `featured` + `joinCode` selects the richest rail variant (join-code well +
DM chip), which is exactly the branch we most want a visitor to see.

```ts
const DEMO_CHARACTERS: Character[] = [ /* 3 entries */ ]
```

| # | id | name | race (id) | classes (id) | STR/DEX/CON/INT/WIS/CHA | speed | derived AC | level badge |
|---|---|---|---|---|---|---|---|---|
| 1 | 9101 | Kaelen Vurr | Dragonborn (9201) | Paladin (9301) | 17 / 11 / 15 / 9 / 12 / 16 | 30 | 10 | `LV 4` |
| 2 | 9102 | Sylra Moonhollow | Wood Elf (9202) | Ranger (9302) + Rogue (9303) | 12 / 18 / 13 / 10 / 16 / 11 | 35 | 14 | `LV 3/2` |
| 3 | 9103 | Bram Ironkettle | Rock Gnome (9203) | Artificer (9304) | 8 / 14 / 14 / 17 / 12 / 10 | 25 | 12 | `LV 3` |

Coverage this buys: one multiclass badge (`LV 3/2`), highlighted `>= 16` cells on all three
cards (STR 17 + CHA 16; DEX 18 + WIS 16; INT 17), three distinct speeds so the `FT` slot is
not visually repetitive, and three AC values that differ.

Filler fields required by `Character` but not rendered by the card — keep them terse and
plausible, never `null as any`:

- `user: { id: 9000, username: 'preview' }`
- `campaign: { id: 9001, name: 'The Sunken Crown' }` (id matches `DEMO_CAMPAIGN.id`)
- `characteristics: []`, `alignment`, `background` — one-word canonical values
- `characterStats.xp`, `.proficiency`, `.proficiencies: {}`, `.hp`
- `CharacterClass.description: ''` (required by the interface)
- `CharacterRace.description: ''` (required by the interface)

Ids are in a 9000+ band on purpose: they can never collide with a real record if these
constants ever leak into a debugging session.

```ts
const DEMO_LEVELS: Map<number, LevelRecord[]> = new Map([
  [9101, [{ dndClass: { id: 9301 }, level: 4 }]],
  [9102, [{ dndClass: { id: 9302 }, level: 3 }, { dndClass: { id: 9303 }, level: 2 }]],
  [9103, [{ dndClass: { id: 9304 }, level: 3 }]],
])
```

**Non-obvious contract** (from `deriveLevelBadge`, `CharacterCard.tsx` L22-34): the badge is
built by mapping over `character.characterClasses` **in order** and looking up a record whose
`dndClass.id` matches, compared as `String()`. So `DEMO_LEVELS` keys must equal the character
ids, and each record's `dndClass.id` must equal the corresponding `CharacterClass.id`. Get
this wrong and the badge silently disappears — no error. The `LV 3/2` assertion in
`DemoLanding.test.tsx` is the guard.

### 3.2 Derivation helpers — none are needed

Audited against `Home.tsx`:

- `deriveCharacterLevel` (Home L62) exists **only** to power `sort === 'level'`. The landing
  has no sort control → not needed. The visible level badge is derived inside `CharacterCard`
  from `DEMO_LEVELS`, not by the page.
- `campaignNameById` (App L278) exists because a real `Character` only carries `campaign.id`.
  The landing has exactly one campaign, so `CharacterCard`'s `campaignName` prop is passed the
  literal `DEMO_CAMPAIGN.name` — a Map lookup for a constant is ceremony.
- `deriveInitials` / `deriveFirstName` — avatar and "Welcome back" are out of scope.
- `railCampaigns` / `metrics` `useMemo`s — replaced by literals.

**Net: `DemoLanding` copies zero logic from `Home`, and imports nothing from it.** That is
the cleanest possible answer to "share or duplicate?" — there is nothing left to share.
`isDungeonMaster` is passed `true` (the visitor is shown a DM's table), which drives the
blue campaign dot on all three cards.

---

## 4. ADR-03 — `App.tsx` dead-code removal

Removing `onSelectCharacter` / `onSelectCampaign` orphans a chain, because `DemoLanding` was
the only producer of `demoCampaignId`, and `DemoCampaignDetail` (itself only reachable from
`demoCampaignId`) was the only other producer of `demoCharacterId`. Leaving them yields
unreachable branches plus `@typescript-eslint/no-unused-vars` noise on the setters.

Concrete target areas for the tasks phase:

| # | Location (current line) | Action |
|---|---|---|
| 1 | `import { DemoCampaignDetail } from './pages/DemoCampaignDetail'` (L5) | **delete** — sole usage disappears in #5. `Characters` (L6) and `DemoLanding` (L4) imports **stay**. |
| 2 | `const [demoCharacterId, setDemoCharacterId] = useState<number \| null>(null)` (L86) | delete |
| 3 | `const [demoCampaignId, setDemoCampaignId] = useState<number \| null>(null)` (L87) | delete |
| 4 | `handleLogout` (L427-428) — `setDemoCharacterId(null)` / `setDemoCampaignId(null)` | delete both lines; rest of the reset block untouched |
| 5 | unauthenticated render chain (L693-736): `else if (demoCharacterId)` branch (L707-719, read-only `<Characters source="demo">`) and `else if (demoCampaignId)` branch (L720-727, `<DemoCampaignDetail>`) | delete both branches. The chain collapses to `if (authView === 'login') { <Login/> } else { <DemoLanding/> }` |
| 6 | `<Login onAuthSuccess>` (L702-703) — `setDemoCharacterId(null)` / `setDemoCampaignId(null)` | delete both lines |
| 7 | `<DemoLanding>` props (L730-734) | keep `onLoginRequest={() => setAuthView('login')}`; delete `onSelectCharacter` and `onSelectCampaign` |

Verification gate: `npx tsc --noEmit` **and** `npx eslint .` must be clean — `tsc` alone does
not flag an unused state setter, so eslint is the load-bearing check here.

`DemoCampaignDetail.tsx`, `Characters.tsx`'s `source="demo"` path, `interfaces/demo.ts`,
`services/api.ts`'s `demo` namespace and the backend `/api/demo/*` endpoints all remain on
disk, untouched and now unreferenced by the landing. This is **intentional and accepted**:
deleting them is a separate change with its own backend blast radius.

---

## 5. `DemoLanding.tsx` — component tree

Mirrors `Home.tsx`'s outer geometry so the two pages share a silhouette. Class strings are
copied verbatim from the cited Home lines — copying *shell* classes is unavoidable (the shell
is not a component); copying *card* classes is what ADR-01 exists to prevent.

```
<div className="bg-home-ink-900 text-home-text" style={{fontFamily:'var(--font-home-display)'}}>   ← Home L170
│
├─ <header className="flex h-[58px] items-center justify-between bg-home-ink-800
│                     border-b border-home-line px-[26px]">                                        ← Home L171
│   ├─ brand cluster: rombo div + "D&D MANAGER" wordmark                                           ← Home L173-184 verbatim
│   │   (NO <nav>, NO search box, NO avatar, NO logout)
│   └─ <button type="button" onClick={onLoginRequest}>Log In / Sign Up</button>
│        className = Home's primary CTA style (Home L284): h-[36px] rounded-home-md
│        bg-home-blue-600 px-[16px] font-home-display text-[12.5px] font-semibold text-white
│        shadow-[0_6px_18px_-6px_rgba(37,99,235,.8)]
│
├─ hero band <div className="border-b border-home-line
│                bg-[radial-gradient(900px_240px_at_12%_-40%,rgba(59,130,246,.14),transparent_70%)]
│                p-[24px_26px_20px]">                                                              ← Home L269
│   ├─ eyebrow  "A LIVE LOOK INSIDE"      (mono, tracking-[.18em], #5b6deb)                        ← Home L272 classes
│   │            NOTE: static string, NOT new Date() — see ADR-04
│   ├─ <h1>     "See what your table looks like"                                                   ← Home L275 classes
│   ├─ <p>      "A real campaign and its heroes, rendered exactly as you'll see
│   │            your own. Log in or sign up to start yours."                                      ← Home L278 classes
│   │            (NO "+ New character" / "+ New campaign" buttons)
│   └─ <div data-testid="demo-metrics-grid"
│           className="grid grid-cols-2 gap-[10px] md:grid-cols-4">                                ← Home L298
│        <MetricTile value={1} label="CAMPAIGNS" />
│        <MetricTile value={3} label="CHARACTERS" />
│        <MetricTile value={1} label="AS DUNGEON MASTER" valueClassName="text-home-blue-400" />
│        <MetricTile value={4} label="PLAYERS AT THIS TABLE" />
│
└─ body <div data-testid="demo-body-grid"
             className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_368px]">       ← Home L315
    ├─ LEFT  <div className="order-2 p-[22px_26px_28px] lg:order-none">                            ← Home L316
    │   ├─ section head: <h2>Characters</h2> + count chip "3"                                      ← Home L317-325
    │   │   (NO all/active/retired filters, NO sort <select>)
    │   └─ <div className="grid grid-cols-2 gap-[12px]">                                           ← Home L362
    │        {DEMO_CHARACTERS.map(c => (
    │          <CharacterCard key={c.id} character={c}
    │            campaignName={DEMO_CAMPAIGN.name}
    │            isDungeonMaster
    │            levelsByCharacterId={DEMO_LEVELS}
    │            interactive={false} />))}
    │        (NO CreateCharacterCta)
    │
    └─ RIGHT <div className="order-1 border-l border-home-line bg-home-ink-850
                             p-[22px_24px_28px] lg:order-none">                                    ← Home L385
        ├─ section head: <h2>Campaigns</h2> + count chip "1"                                       ← Home L386-394
        │   (NO "+" new-campaign button)
        ├─ <div data-testid="demo-rail-list" className="flex flex-col md:flex-row
        │        md:overflow-x-auto lg:flex-col">                                                  ← Home L417
        │     <div className="md:min-w-[280px] lg:min-w-0">
        │       <CampaignRailCard campaign={DEMO_CAMPAIGN} featured interactive={false} />
        │     </div>
        └─ (NO "JOIN A TABLE" block — Home L431-450 omitted entirely)
```

No `status` prop, no skeletons, no error band, no `useState`/`useEffect`, no `api` import.
`import '../App.css'` is dropped — the legacy stylesheet was only feeding the classes that
this rewrite deletes; Dense Ledger tokens arrive via the global Tailwind entry, exactly as
they do for `Home.tsx` (which imports no CSS of its own).

### ADR-04 — static eyebrow instead of `new Date()`

Home L273 renders today's date. Reproducing that on the landing would make
`DemoLanding.test.tsx` time-dependent and would imply "this data is from today", which is a
lie. The eyebrow slot keeps Home's typography with the constant `A LIVE LOOK INSIDE`.

### ADR-05 — accepted layout gap

3 characters in a 2-column grid leaves the 4th cell empty. Home fills that slot with
`CreateCharacterCta`, which the proposal explicitly puts out of scope. Accepted as-is; the
one-line remedy (append a 4th character constant) is available if visual review rejects it.
No structural rework is implied either way.

---

## 6. Testing design

Strict TDD is active. Runner: `cd frontend && npx vitest run`.
**Corrected baseline** (see apply-progress.md): the originally-stated "8 pre-existing failures
in `CreateCharacterCta.test.tsx`/`CreateCharacter.test.tsx`" do not exist in this codebase.
The actual baseline is **1 pre-existing flaky `App.test.tsx` fake-timer test** — ignore it, do
not fix it. The bar is *no new* failures.

TDD ordering (each red before green):
1. `CharacterCard.test.tsx` / `CampaignRailCard.test.tsx` — the `interactive` prop.
2. `DemoLanding.test.tsx` — the rewritten page.
3. `App.test.tsx` — the pruned unauthenticated routing.

### 6.1 `DemoLanding.test.tsx` (rewritten)

Delete the `vi.mock('../services/api', …)` block entirely — its absence is itself an
assertion: if the component still called `api.demo.*`, the unmocked import would blow up.

| # | Assertion |
|---|---|
| 1 | Renders synchronously: use `render` + `getBy*` with **no `await findBy*` anywhere**. An accidental async path would fail these. |
| 2 | All three character names present: `Kaelen Vurr`, `Sylra Moonhollow`, `Bram Ironkettle`. |
| 3 | Campaign name `The Sunken Crown` and join code `A3F9-B72C` present. |
| 4 | Multiclass badge `LV 3/2` present — guards the `DEMO_LEVELS` ↔ `characterClasses` id wiring (§3.1). |
| 5 | At least one ability cell has `data-highlighted="true"` — guards the `>= 16` showcase requirement. |
| 6 | Metric tiles: `CAMPAIGNS`/`CHARACTERS`/`AS DUNGEON MASTER`/`PLAYERS AT THIS TABLE` labels render, and the CHARACTERS tile value matches `DEMO_CHARACTERS.length` (asserted against the constant, not the literal `3`, so the two can never drift). |
| 7 | No loading UI: `queryByText(/loading/i)` is null; `queryAllByTestId('character-card-skeleton')` is empty. |
| 8 | No error UI: `queryByText(/unavailable/i)` and `queryByRole('button', { name: /retry/i })` are null. |
| 9 | **Non-interactivity**: `queryAllByRole('button')` returns **exactly one** element — the Log In / Sign Up CTA. This single assertion covers `Open sheet →`, `···`, `Open table`, `Manage`, `Open →`, the rail name button and `CopyCodeButton` in one shot. |
| 10 | Non-interactivity, structural: the element containing `Kaelen Vurr` has **no** ancestor with `role="button"`; `container.querySelectorAll('[tabindex]')` is empty. |
| 11 | `onLoginRequest` fires: `await user.click(getByRole('button', { name: /log in.*sign up/i }))` → `toHaveBeenCalledTimes(1)`. |
| 12 | Authenticated-only chrome absent: no `role="search"`, no `role="img"` avatar, no `Logout`, no `Sort characters` select, no `JOIN A TABLE`, no `+ New character`. |

The component takes exactly one prop; any test still passing `onSelectCharacter` /
`onSelectCampaign` must be deleted along with the four navigation tests it belonged to.

### 6.2 `CharacterCard.test.tsx` (additive)

Existing 10 tests stay **verbatim** — they are the default-`true` regression net, and their
continued passing without edits is the proof that the prop is additive.

New `describe('CharacterCard — interactive mode')`:

| # | Assertion |
|---|---|
| 1 | Default (prop omitted): container has `role="button"` and `tabIndex=0`; `Open sheet →` and `···` are present. |
| 2 | Explicit `interactive` (`true`): identical to #1. |
| 3 | `interactive={false}`: `queryByRole('button')` is null; the card root has no `tabindex` attribute. |
| 4 | `interactive={false}`: `Open sheet →` and `···` are absent. |
| 5 | `interactive={false}` with `onOpenSheet` supplied: clicking the card name does **not** call it. |
| 6 | `interactive={false}`: name, `Elf · Wizard`, the AC testid and the ability strip all still render — the card is inert, not gutted. |
| 7 | Type-level: rendering without `onOpenSheet` compiles (`tsc --noEmit` is the gate) and does not throw at runtime. |

### 6.3 `CampaignRailCard.test.tsx` (additive)

Existing 8 tests stay verbatim.

New `describe('CampaignRailCard — interactive mode')`:

| # | Assertion |
|---|---|
| 1 | `interactive={false}`, featured DM: `Open table`, `Manage`, `Open →` all absent; `queryAllByRole('button')` is empty (this also pins `CopyCodeButton`'s removal). |
| 2 | `interactive={false}`: campaign name still renders as text but `queryByRole('button', { name: 'Stormwreck Isle' })` is null. |
| 3 | `interactive={false}`, featured DM: join code `A3F9-B72C` **still visible** — the well survives, only its copy button goes. |
| 4 | `interactive={false}`, non-featured PLAYER: `Your hero: Iria` still renders, `Open →` does not. |
| 5 | `interactive={false}`: role chip (`DM`) and meta line (`5 players · 2 of your heroes`) unchanged. |
| 6 | Default: `Open →` present and `onOpen` fires (already covered — keep as the explicit contrast case). |

### 6.4 `Home.test.tsx` (regression gate — expected zero edits)

Home never passes `interactive`, so it must stay green untouched. If any Home test needs a
change, the prop is not additive and ADR-01's invariant is violated — **stop and re-derive**,
do not patch the test. Add one explicit guard so the intent is recorded rather than implied:
Home's rendered character cards still expose `role="button"` and `Open sheet →`.

### 6.5 `App.test.tsx`

| Target | Action |
|---|---|
| `describe('App demo landing (unauthenticated)')` `beforeEach` (L964-975) | Delete the `api.demo.campaigns` / `api.demo.characters` mock setup — the landing no longer calls them. Keep the mock module shape if other suites reference it. |
| `renders the demo landing instead of the login form…` (L978) | Keep; swap the `Demo Campaign` anchor for `The Sunken Crown` (or the CTA button, which is store-independent). |
| `switches to the login form when the demo CTA is clicked` (L985) | Keep; same anchor swap. Highest-value surviving test — it covers the one prop that remains. |
| `opens the read-only demo character sheet…` (L994) | **Delete** — `demoCharacterId` no longer exists. |
| `returns to the demo landing when "Back to Demo"…` (L1022) | **Delete** — same reason. |
| `opens the demo campaign detail view…` (L1050) | **Delete** — `demoCampaignId` no longer exists. |
| `opens a character sheet from within the demo campaign detail view…` (L1068) | **Delete** — same reason. |
| `describe('App logout returns to demo landing')` (L1105) | Keep as-is. It already asserts on the `/log in.*sign up/i` button, not on demo data, so it survives. Its `api.demo.*` mocks (L1116-1117) become inert; removing them is optional cleanup. |

Coverage lost by those 4 deletions is *routing to pages this change deliberately unlinks* —
it is not lost behavior. `DemoCampaignDetail.tsx` keeps its own test file, if any.

### 6.6 Exit gates

- `cd frontend && npx vitest run` → no new failures beyond the 1 known pre-existing flaky test.
- `cd frontend && npx tsc -b --noEmit` → clean (plain `tsc --noEmit` is a no-op in this repo — use `-b`).
- `cd frontend && npx eslint .` → clean (catches the orphaned `App.tsx` setters that `tsc` misses).

---

## 7. Risks and open items

| Risk | Severity | Mitigation |
|---|---|---|
| `DEMO_LEVELS` id wiring wrong → level badges silently vanish (no error) | Medium | Test 6.1 #4 asserts `LV 3/2` explicitly. |
| Card height differs from Home's (dropped footer / action rows) | Low | Accepted in ADR-01; documented, not a defect. |
| Empty 4th grid cell (3 characters, 2 columns) | Low | ADR-05; one-line fix available if visual review objects. |
| Someone later defaults `interactive` to `false` | Medium | ADR-01's invariant is stated, and Home's untouched test suite fails loudly if it happens. |
| `DemoCampaignDetail.tsx` rots unreferenced | Medium | Explicitly accepted; deletion is a separate change. |
| Hardcoded metrics drift from the constants | Low | Test 6.1 #6 asserts the CHARACTERS tile against `DEMO_CHARACTERS.length`. |

**Unresolved (needs no decision before tasks)**: whether to eventually delete the
`/api/demo/*` backend surface. Out of scope here by explicit proposal decision.

---

## 8. Next Recommended

`sdd-tasks` (once `sdd-spec` is also complete).
