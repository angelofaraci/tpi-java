# Verification Report: Restyle Demo Landing — "Dense Ledger"

**Change**: restyle-demo-landing
**Date**: 2026-07-27
**Mode**: full spec-driven verification (proposal/spec/design/tasks/apply-progress all present)
**Verified against**: `main` @ 3070865 (all 3 chained PRs merged: #5 cards, #6 DemoLanding rewrite, #7 App.tsx cleanup)

## Completeness (tasks.md)

| Phase | Claimed | Actual (code-verified) |
|---|---|---|
| 1 — CharacterCard `interactive` | [x] all | Confirmed in code + tests |
| 2 — CampaignRailCard `interactive` | [x] all | Confirmed in code + tests |
| 3 — DemoLanding rewrite | **[ ] all 4 unchecked** | Confirmed DONE in code (DemoLanding.tsx, demoLandingData.ts, DemoLanding.test.tsx all present, correct, green) |
| 4 — App.tsx cleanup | [x] all | Confirmed in code |
| 5 — Regression pass | [x] all | Confirmed via fresh test run |

## Build/Test Evidence (executed fresh, not trusted from apply-progress)

- `cd frontend && npx vitest run` → **267 passed, 1 failed** (268 total). Failure: `App.test.tsx > App create campaign flow > returns home and refreshes characters after creating a character` (fake-timer timeout) — matches claimed pre-existing flaky test, unrelated to this change.
- `cd frontend && npx tsc -b --noEmit` → clean, 0 errors.
- `cd frontend && npx eslint .` → 1 pre-existing error (`Characters.tsx:297` `no-useless-escape`) + 2 pre-existing warnings (`AdminPanel.tsx` `react-hooks/exhaustive-deps`) — both files confirmed untouched by this change (zero diff across all 3 merge commits).

All results match what apply-progress.md claimed.

## Spec Compliance Matrix

| Requirement | Status | Evidence |
|---|---|---|
| Landing renders statically, no fetch | PASS | `DemoLanding.tsx`/`demoLandingData.ts` contain no `api.*`/`useState`/`useEffect`; test asserts no loading/error UI |
| Dense Ledger shell + page structure | PASS | `bg-home-ink-900`, hero, 4-tile metrics row, 2-col body grid present; matches Home's layout |
| Simplified header (wordmark + single CTA) | PASS | Header renders only rombo, wordmark, `Log In / Sign Up`; test asserts exactly 1 button, no nav/search/avatar/logout |
| Logged-out hero copy + hardcoded metrics | PASS | No "Welcome back" text (tested); 4 tiles hardcoded 1/3/1/4, CHARACTERS tile asserted against `DEMO_CHARACTERS.length` |
| `interactive?: boolean` on CharacterCard | PASS | Default `true`, optional `onOpenSheet`, conditional role/tabIndex/handlers/footer; 10 pre-existing tests untouched + 7 new |
| `interactive?: boolean` on CampaignRailCard | PASS | Default `true`, optional `onOpen`/`onManage`, name span/button swap, CTAs/CopyCodeButton gated; 8 pre-existing tests untouched + 6 new |
| DemoLanding callback contract (`onLoginRequest` only) | PASS | `DemoLandingProps` has only `onLoginRequest`; all cards passed `interactive={false}`, no nav callbacks |
| App.tsx dead code removal | PASS | No `demoCampaignId`/`demoCharacterId`/`DemoCampaignDetail` remain; `<DemoLanding onLoginRequest={...} />` is the only prop passed |
| Test suite regression gate | PASS | 267/268, only the pre-existing flaky test fails; `Home.test.tsx` 35/35 unmodified |
| Out-of-scope files untouched | PASS | `git diff --stat` across all 3 merge commits shows zero diff for `Home.tsx`, `Characters.tsx`, `DemoCampaignDetail.tsx`, `services/api.ts`, `interfaces/demo.ts` |

## Issues

### CRITICAL
None.

### WARNING
1. **tasks.md Phase 3 checkboxes (3.1–3.4) remain unchecked** despite the work being fully implemented, tested, and merged (PR #6, commit `abcb3d5`). apply-progress.md's PR #3 section explicitly says it corrected "tasks.md/design.md" baseline text but did not tick these boxes. This is a tracking/documentation gap only — code inspection and fresh test execution confirm the underlying work is done — but it should be fixed before archive so the artifact trail is accurate (the archive phase should not copy forward a tasks.md that shows incomplete work).

### SUGGESTION
1. Design.md §3 ADR-02 (constants live inline in `DemoLanding.tsx`) was deviated from — constants were extracted to `demoLandingData.ts` due to `react-refresh/only-export-components` lint constraints. This is well-justified and documented in apply-progress.md, but design.md itself was never updated to reflect the actual final shape — future readers of design.md alone would expect an inline `export const`. Consider a one-line addendum to design.md for historical accuracy (non-blocking).
2. tasks.md's Review Workload Forecast and baseline text ("8 pre-existing failures...") was corrected in a later commit but the correction commingles process notes into a spec-of-record file; acceptable for this project's convention but worth flagging for future changes to keep tasks.md focused on checkboxes.

## Verdict

**PASS WITH WARNINGS** — implementation is complete and correct against spec.md and design.md, all test/build/lint evidence reproduces the claims in apply-progress.md, and out-of-scope files are verifiably untouched. One WARNING (tasks.md checkbox drift, cosmetic/tracking only, no code impact) should be fixed before archive but does not block it materially.

**Ready to archive**: Yes, after ticking tasks.md 3.1–3.4 (or archiving with the WARNING explicitly noted in the archive report).
