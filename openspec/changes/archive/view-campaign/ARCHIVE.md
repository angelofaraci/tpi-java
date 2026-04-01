# Archive: view-campaign

**Archived**: 2026-03-31  
**Status**: completed ✅

## Summary

Added a full campaign detail view (Phase 1 — DM view) to the D&D Manager frontend. The feature allows Dungeon Masters to navigate from a campaign card on the home screen into a dedicated detail page showing roster data, metadata, and a delete action with confirmation.

## Artifacts

| Artifact | Path |
|----------|------|
| Exploration | `openspec/changes/archive/view-campaign/explore.md` |
| Proposal | `openspec/changes/archive/view-campaign/proposal.md` |
| Specification | `openspec/changes/archive/view-campaign/spec.md` |
| Design | `openspec/changes/archive/view-campaign/design.md` |
| Tasks | `openspec/changes/archive/view-campaign/tasks.md` |
| Stable spec | `openspec/specs/view-campaign.md` |

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/ViewCampaign.tsx` | Created |
| `frontend/src/services/api.ts` | Added `findById` + `remove` to campaigns |
| `frontend/src/App.tsx` | Added view state, handlers, render branch, delete dialog |
| `frontend/src/App.css` | Added `.view-campaign-*` styles |
| `frontend/src/App.test.tsx` | Added `describe('App view campaign flow')` — 11 tests |
| `frontend/src/interfaces/campaign.ts` | Added `CampaignParticipant`, `CampaignCharacterReference` |

## Test Results

- **11 new tests added** — all passing ✅
- **0 new failures introduced** — 8 pre-existing failures in `CreateCharacter.test.tsx` unchanged

## Key Decisions

1. `isDungeonMaster` is a prop (not derived from API) — `CampaignDto.dm` is `@JsonIgnore` on the backend
2. Confirmation dialog lives in `App.tsx`, not in `ViewCampaign` — follows character deletion pattern
3. Optimistic campaign removal from home list on delete success — consistent with character deletion

## Known Limitations / Phase 2

- Backend must expose `CampaignDto.dm` to support player-perspective view
- Requires a `GET /campaigns/joined` endpoint for campaigns where user is a player
