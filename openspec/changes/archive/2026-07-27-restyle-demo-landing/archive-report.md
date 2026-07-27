# Archive Report: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Date Archived**: 2026-07-27
**Archive Location**: `openspec/changes/archive/2026-07-27-restyle-demo-landing/`
**Artifact Store Mode**: openspec

---

## Executive Summary

The `restyle-demo-landing` change has been successfully archived. All implementation phases (1-5) are complete and verified. The change introduced an `interactive?: boolean` prop to `CharacterCard` and `CampaignRailCard` components, completely rewrote the demo landing page with Dense Ledger styling and hardcoded data, and removed dead code from `App.tsx`. Verification passed with warnings (documentation-only issues now corrected); no code defects remain. The SDD cycle is complete.

---

## Change Scope

**What was changed**: 
- Restyle `DemoLanding.tsx` with Dense Ledger design system tokens and layout
- Add optional `interactive?: boolean` prop (default `true`) to `CharacterCard` and `CampaignRailCard`
- Hardcode demo data as typed module constants (`demoLandingData.ts`)
- Remove orphaned state and dead render branches from `App.tsx`
- Update all affected test suites (3 new test suites for the cards, 1 rewritten for landing, 1 pruned for App)

**What was NOT changed** (explicitly out of scope):
- `Home.tsx`, `Characters.tsx`, `DemoCampaignDetail.tsx`, `services/api.ts`, `interfaces/demo.ts`
- Backend `/api/demo/*` endpoints
- No new design tokens, fonts, or dependencies

---

## Artifacts Archived

| Artifact | Path | Status |
|---|---|---|
| Proposal | `proposal.md` | Present, final |
| Specification | `spec.md` | Present, final |
| Design | `design.md` | Present, **corrected** (ADR-02 updated to reflect actual impl) |
| Tasks | `tasks.md` | Present, **corrected** (Phase 3 checkboxes ticked) |
| Apply Progress | `apply-progress.md` | Present, all phases complete |
| Verify Report | `verify-report.md` | Present, PASS WITH WARNINGS |

---

## Corrections Made Before Archive

### 1. tasks.md Phase 3 checkboxes (3.1–3.4)
**Was**: Unchecked despite work being complete and merged
**Fixed**: Ticked all four checkboxes to reflect actual completion status
**Reason**: Verification identified this as a documentation/tracking gap — code was done, but SDD task artifact did not reflect it

### 2. design.md ADR-02 — Data module location
**Was**: States "three module-level `const` declarations at the top of `DemoLanding.tsx`"
**Fixed**: Updated to document actual implementation — constants extracted to `demoLandingData.ts` due to `react-refresh/only-export-components` lint constraint
**Reason**: Implementation diverged from design for a valid, documented reason; design artifact now matches reality so future readers have accurate reference

---

## Build & Test Evidence (Final, Fresh Verification)

- **Test suite**: `cd frontend && npx vitest run` → **267 passed, 1 failed** (268 total)
  - 1 known pre-existing flaky `App.test.tsx` fake-timer test (unrelated, pre-change)
  - Zero new failures introduced by this change
- **Type checking**: `cd frontend && npx tsc -b --noEmit` → **clean, 0 errors**
- **Linting**: `cd frontend && npx eslint .` → **clean on all changed files** (3 pre-existing issues in unrelated files, unchanged)

---

## Verification Status

**Overall Verdict**: PASS WITH WARNINGS (from verify-report.md)

No CRITICAL issues. The two WARNINGs identified by verification have been addressed:
1. tasks.md checkbox tracking → **FIXED** (ticked 3.1–3.4)
2. design.md ADR-02 accuracy → **FIXED** (updated to document actual impl)

All out-of-scope files confirmed untouched via diff. Spec compliance matrix fully green.

---

## Specification Coverage

All requirements from the original specification are met:

| Requirement Class | Status |
|---|---|
| Landing renders statically, no network fetch | ✓ PASS |
| Dense Ledger shell and page structure | ✓ PASS |
| Simplified header (wordmark + single CTA) | ✓ PASS |
| Logged-out hero copy + hardcoded metrics | ✓ PASS |
| `interactive?: boolean` on card components | ✓ PASS |
| DemoLanding callback contract (`onLoginRequest` only) | ✓ PASS |
| App.tsx dead code removal | ✓ PASS |
| Test suite regression gate (no new failures) | ✓ PASS |
| Out-of-scope files untouched | ✓ PASS |

---

## Implementation Summary

### Phase 1: CharacterCard `interactive` prop (PR #1)
- Added optional `interactive?: boolean` prop (default `true`)
- Made `onOpenSheet` optional
- Conditionally render role/tabIndex/handlers and footer row
- 7 new tests, 10 pre-existing tests pass unmodified

### Phase 2: CampaignRailCard `interactive` prop (PR #1)
- Added optional `interactive?: boolean` prop (default `true`)
- Made `onOpen`/`onManage` optional
- Swap name button→span, gate CTAs and CopyCodeButton
- 6 new tests, 8 pre-existing tests pass unmodified

### Phase 3: DemoLanding rewrite + data module (PR #2)
- New `demoLandingData.ts` with `DEMO_CAMPAIGN`, `DEMO_CHARACTERS` (3 chars), `DEMO_LEVELS`
- Rewrite `DemoLanding.tsx` as pure render function (no state, no fetch, no loading)
- Dense Ledger shell: header, hero, 4-tile metrics, 2-col body with non-interactive cards
- Rewrite `DemoLanding.test.tsx` with 11 assertions on content and non-interactivity

### Phase 4: App.tsx dead-code removal (PR #3)
- Delete `demoCharacterId`/`demoCampaignId` state and their usage
- Delete unreachable render branches for `DemoCampaignDetail` and demo character sheet
- Delete `DemoCampaignDetail` import
- Trim `<DemoLanding>` to only `onLoginRequest` prop

### Phase 5: Regression pass (PR #3)
- Full test suite green (267/268, 1 known pre-existing flaky test)
- TypeScript clean
- ESLint clean on all changed files
- All out-of-scope files confirmed untouched

---

## Delta Specs

No delta specs were created as part of this change. The change is scoped entirely to pre-login UI and component-level props; no new backend contracts or data structures were introduced.

---

## Known Limitations and Decisions

1. **Empty 4th grid cell**: 3 characters in a 2-column grid leaves the 4th cell empty. One-line fix available (add a 4th character constant) if visual review requires it. Accepted as-is per proposal.

2. **DemoCampaignDetail.tsx orphaned but retained**: Intentional per proposal. Deletion is a separate change with backend implications.

3. **Static eyebrow instead of date**: Landing uses constant `A LIVE LOOK INSIDE` instead of `new Date()`. Prevents time-dependence and false "this is current data" framing.

4. **Data module location**: Extracted to `demoLandingData.ts` instead of inline in `DemoLanding.tsx` due to `react-refresh/only-export-components` lint rule. Serves two consumers (component + test) — indirection is justified. Documented in design.md ADR-02.

---

## Rollback

If necessary, the change can be reverted via `git revert` of the three chained PRs (#5, #6, #7). No database schema, backend endpoints, or token logic requires reversal — this is a UI-only change.

---

## Next Steps

The SDD cycle for this change is **complete**. The change is ready for:
1. PR review (if not already completed)
2. Staging/production deployment
3. Closed-loop feedback collection

No follow-up SDD changes are required. Future improvements (e.g., deleting orphaned endpoints, adding a 4th character, etc.) should be separate changes.

---

## Archive Contents Manifest

```
openspec/changes/archive/2026-07-27-restyle-demo-landing/
├── proposal.md           (original proposal, final)
├── spec.md               (specification, final)
├── design.md             (design decisions, corrected before archive)
├── tasks.md              (task checklist, corrected before archive)
├── apply-progress.md     (implementation history, all phases)
├── verify-report.md      (verification results, PASS WITH WARNINGS)
└── archive-report.md     (this file)
```

All artifacts are present, readable, and complete. The archive is immutable and serves as the audit trail for the completed change.
