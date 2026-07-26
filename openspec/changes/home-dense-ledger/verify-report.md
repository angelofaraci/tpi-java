# Verification Report: home-dense-ledger (PR3 slice — home body + components + App.tsx wiring)

**Date**: 2026-07-26
**Verifier**: sdd-verify (fresh context, independent)
**Scope**: Phases 3-8 (CharacterCard, CampaignRailCard, MetricTile, Home.tsx body, App.tsx wiring)

## 0. Process Finding (read this first)

The requested diff range `feature/home-dense-ledger-tokens-topbar...feature/home-dense-ledger-home-body`
does **not** contain this batch's work. `git log` shows the `home-body` branch tip is only a merge of
`feature/home-dense-ledger-backend-counts` (PR1) on top of the already-committed tokens/top-bar work — the
diff between the two named branches is a single 4-line change to `frontend/src/interfaces/campaign.ts`.
**All of Phases 3-8 (CharacterCard, CampaignRailCard, MetricTile, Home.tsx body, App.tsx rewiring, and their
tests) exist only as uncommitted working-tree changes** (`git status` shows M/`??` files, not commits on
`home-body`). This review was performed against the actual working tree (`git diff HEAD` + untracked new
files), which is where the real batch lives. **Before this can be pushed/reviewed as "PR3," it must actually
be committed** — right now there is no commit boundary corresponding to the claimed PR3 slice.

## 1. Task Completion (tasks.md, Phases 3-8)

All checkboxes for Phases 3-8 are marked `[x]` except **8.5** (manual visual spot-check), which is honestly
left unchecked with a note that no browser tooling was available. This is CORRECT self-reporting, not a
false claim — but see Critical Finding #1 below: had 8.5 been performed, it would very likely have caught it.

| Phase | Status | Notes |
|---|---|---|
| 3 (CharacterCard) | Complete, verified | Ability highlight, AC, level badge all correct |
| 4 (RailCard/MetricTile) | Complete, verified | |
| 5 (Home body) | Complete, verified | |
| 6 (App.tsx wiring) | Complete, verified | |
| 7 (Responsive) | Complete, **but see Critical #1** | Tests pass but don't catch a real regression |
| 8 (Final verification) | 8.1-8.4 complete and reproduced independently; 8.5 honestly incomplete | |

## 2. Independent Test Execution (reproduced, not trusted from self-report)

| Command | Result |
|---|---|
| `cd frontend && npx vitest run` | **254/254 passed**, 18 files — matches claim |
| `cd frontend && npx tsc --noEmit` | Clean, no errors |
| `cd frontend && npx eslint .` | 1 pre-existing error (`Characters.tsx:297`), 2 pre-existing warnings (`AdminPanel.tsx`) — confirmed both files are untouched by this diff |
| `cd backend && JAVA_HOME=/usr/lib/jvm/java-21-openjdk ./mvnw test` | **89/89 passed**, BUILD SUCCESS — matches claim |
| `git diff HEAD -- frontend/package.json` | No diff — no new dependency added |
| `git diff --stat HEAD -- backend/` | No diff — no backend files touched in this batch |

Claims of 254/254 frontend and 89/89 backend are **confirmed accurate**.

## 3. The 5 Self-Reported Deviations — Verified

| # | Deviation | Verdict |
|---|---|---|
| 1 | `levelsByCharacterId` prop added to `CharacterCard` | **Justified.** `CharacterCard.tsx` derives the level badge via `GET /levels` grouped by `characterId`, matching on `dndClass.id` — NOT a nonexistent `characterClasses[].level` field. Confirmed against `interfaces/character.ts`: `Character`/`CharacterClass` has no `level` field; `LevelRecord` is the only source. Correct, spec-compliant, and covered by real tests (`LV 3/2` multiclass ordering, omission when unmatched). |
| 2 | `campaignFeedback` banner re-added as App-level overlay above `<Home>` | **Justified and scoped correctly.** In `App.tsx` the banner JSX lives only inside the final `else` branch of the `view` if/else chain (the home-view branch); every other view (`character-sheet`, `create-campaign`, `admin`, `view-campaign`, `create-character`, `view-character-readonly`) assigns `content` independently with no banner. Structurally cannot leak to other screens. |
| 3 | Removal of `publicCampaigns` fetch/state/effect | **Justified, no orphaned consumers.** Grepped the entire frontend: no component reads `publicCampaigns` or renders a "Public Campaigns" section. `AdminPanel.tsx` has its own unrelated `api.admin.campaigns.findAll()` call. `PublicCampaignSummary` type and `api.campaigns.findAll()` (the public-campaigns list endpoint) still exist and are exercised only by `api.test.ts`, unrelated to Home. |
| 4 | `handleJoinByCode` calls `GET /campaigns/by-code/{code}` | **Justified — pre-existing endpoint.** `CampaignController.java:66` (`@GetMapping("/campaigns/by-code/{code}")`) and `CampaignService.java:165` (`findByCode`) both exist at commit `048de8f` (well before this change's branch history). No new backend endpoint introduced. |
| 5 | Error band shown alongside partial content | **Reasonable reading of spec**, not a contradiction — matches the "Error band with retry, no alert" scenario. |

All 5 self-reported deviations are real and defensible, not shortcuts.

## 4. App.tsx Correctness

- Local `interface CharacterCard` at the old line ~24: **confirmed deleted** — no such interface exists anywhere in the current `App.tsx`.
- `characters` state: **confirmed typed as `Character[]`** (line 60).
- Parallel fetch: **NOT** a single `Promise.all` as design.md's literal snippet states. Implemented as 4 independent `useCallback`/`useEffect` pairs (`loadCharacters`, `loadCampaigns`, `loadPlayerCampaigns`, `loadLevels`), each with its own request-id race guard, matching ADR-04's explicit choice to keep the existing per-list machinery. This is a **known, disclosed deviation** (task 6.5) — functionally equivalent to "parallel" (none is awaited before the next starts) and does not break the aggregate `loading`/`error` derivation. **WARNING, not CRITICAL** — spec says "fetch in parallel," not "use `Promise.all`," and the existing codebase pattern already worked this way pre-change.
- `filter`/`sort` persist to `localStorage` under exact keys `home.filter`/`home.sort`, read back via `readStoredHomeFilter`/`readStoredHomeSort` on mount with `useState` lazy initializers. Confirmed via `App.test.tsx:712-721` (`persists filter and sort to localStorage and restores them after a character-sheet round trip`), which asserts `localStorage.getItem('home.filter') === 'retired'` and `'level'` for sort — a real, substantive test.

## 5. Component Correctness Spot-Checks

| Item | Verdict |
|---|---|
| AC derivation | `10 + Math.floor((dexterity - 10) / 2)` in `CharacterCard.tsx:16-18` — exact spec match, test confirms DEX 14 → AC 12 |
| Ability highlight threshold | `score >= 16` in `scoreBox.tsx:37` — correct (`>=`, not `>`) |
| Multiclass level badge | `LV {level1}/{level2}` ordered by `character.characterClasses` order — confirmed correct via test with classes `[Wizard(8), Fighter(9)]` and levels `{8:3, 9:2}` → `LV 3/2` |
| Role chip source | Never reads `CampaignDto.dm` — role is tagged in `App.tsx`'s `railCampaigns` memo purely from which source array (`campaigns` vs `playerCampaigns`) an entry came from |
| Join-code auto-format | `formatJoinCodeInput` in `utils/joinCode.ts` — real pure function, `a3f9b72c` → `A3F9-B72C` confirmed by dedicated unit test, not just claimed |

## 6. CRITICAL Findings

### CRITICAL #1 — `min-w-[1280px]` on Home's root container breaks the entire Responsive Contract

**File**: `frontend/src/pages/Home.tsx:170`

```tsx
<div className="min-w-[1280px] bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
```

This forces the ENTIRE home page to never render narrower than 1280px, regardless of actual viewport width.
Tailwind's `md:`/`lg:`/`xl:` utilities respond to the *browser viewport* via media queries, not to this
div's own rendered width — so at a 900px or 600px viewport, the correct responsive classes (`grid-cols-1`,
`order-1`/`order-2`, `grid-cols-2` for metrics, etc.) DO get applied by the media query, but the container
itself still refuses to shrink below 1280px. The practical effect: the page overflows horizontally and the
user must scroll sideways to see content that spec.md's Responsive Contract explicitly requires to *reflow*
at those breakpoints. This directly falsifies:
- Scenario "Rail repositioning on tablet width" (viewport 900px) — the rail visually reorders in the DOM
  but the whole page is still 1280px wide, so nothing actually "fits" at 900px.
- Scenario "Mobile metrics grid" (viewport 600px) — same problem, page cannot render within 600px.
- The `< 768px` responsive contract row: "Everything MUST stack to 1 column" — cannot be honestly satisfied
  while the root container has a hard 1280px floor.

This was **not** one of the 5 disclosed deviations, and none of the Phase 7 tests catch it because those
tests only assert the *presence* of responsive utility classes (`toHaveClass('grid-cols-1')` etc.) via
source-level/class assertions (an already-disclosed limitation of this project's jsdom/vitest setup, which
cannot execute real media queries) — they never assert on, or even look at, the parent's `min-w` class. Task
8.5 (manual visual spot-check) was the only planned check that would likely have caught this, and it was
explicitly skipped for lack of browser tooling.

**Impact**: the Responsive Contract requirement — one of spec.md's 8 top-level requirements — is not
actually satisfied at runtime for any viewport under 1280px, despite the automated test suite being green.

### CRITICAL #2 — This batch has not been committed to `feature/home-dense-ledger-home-body`

All of Phases 3-8 exist only as uncommitted working-tree changes (see Section 0). There is no reviewable
commit/PR for what is being described as "PR3." This blocks the "safe to commit as PR3" question at a
process level, independent of code correctness.

## 7. WARNING Findings

- **App.tsx parallel fetch is 4 independent effects, not `Promise.all`** (design.md's literal wording)
  — disclosed deviation, functionally reasonable, does not break spec's observable "loading until both
  resolve" behavior. Downgraded from CRITICAL because ADR-04 explicitly authorizes keeping the existing
  per-list race-guard pattern.
- **44px minimum hit-area requirement (`<768px` responsive contract row) is not implemented or tested.**
  Nav/action buttons (`+ New character` `h-[36px]`, "Join" button `h-[34px]`, "···" menu button, unset-height
  logout button) are all below the spec's mandated 44px minimum for the `<768px` band. No test covers this.
  Given Critical #1, this is currently unobservable in practice (the layout doesn't reflow below 1280px
  anyway), but it must still be fixed as part of a real responsive fix.
- **Task 8.5 (manual visual spot-check) is honestly left undone** — correctly disclosed as skipped, but its
  absence is exactly why Critical #1 shipped undetected. Recommend performing it before merge, using an
  actual browser or Playwright/Storybook viewport emulation, not just jsdom class assertions.
- **Unrelated scope creep in working tree**: `.atl/skill-registry.md` (modified) and `.atl/.skill-registry.cache.json` (new, untracked) are unrelated tooling-cache changes sitting in the same working tree as this batch. Not part of spec.md/design.md/tasks.md scope — should not be included in the PR3 commit.

## 8. SUGGESTION Findings

- Consider adding a real browser-based responsive test (Playwright) for at least the two spec-cited
  viewport widths (900px, 600px) instead of relying solely on class-presence assertions, given jsdom cannot
  execute media queries — this is the second time (Phase 2's `index.css.test.ts`, Phase 7's class assertions)
  this project has substituted a source-level test for genuine rendered-CSS verification, and it just let a
  real bug through.

## 9. Final Verdict

**FAIL** (Critical #1 is a real, verifiable regression against the Responsive Contract requirement; Critical
#2 is a process blocker — nothing to actually diff/review as "PR3" yet).

Everything else — the 5 disclosed deviations, App.tsx wiring, component derivation logic, level-badge
correctness, AC/ability-highlight formulas, join-code formatting, and both test suites (254/254 frontend,
89/89 backend, clean `tsc`/`eslint`) — is accurate and verified independently. This is a well-executed batch
functionally; it is not safe to merge as-is because of the `min-w-[1280px]` responsive regression, and it
cannot be reviewed as "PR3" until it is actually committed to a branch/PR.
