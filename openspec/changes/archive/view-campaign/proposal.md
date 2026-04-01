# Proposal: Campaign Detail View

**Change**: view-campaign  
**Date**: 2026-03-31  
**Status**: completed (retroactive)

---

## Intent

Allow the Dungeon Master to navigate from the home screen into a dedicated campaign detail view, where they can inspect the campaign's metadata, player roster, and assigned characters — and optionally delete the campaign with a confirmation step.

---

## Problem Statement

The home screen lists owned campaigns as cards with summary data (name, date, player count). There is no way to see the full detail of a campaign — who the players are, which characters are assigned, or perform management actions like deletion from a contextual view. The only delete action is a quick-action button directly on the card, which lacks context.

---

## Proposed Solution

### Phase 1 (this change): DM Detail View

Add a `ViewCampaign` page component that:
- Fetches full campaign detail from `GET /campaign/{id}`
- Displays: campaign name, privacy badge, formatted creation date, description, player roster (username + email), character roster (id reference), and player/character counts
- Shows a DM role indicator strip
- Provides a "Delete Campaign" action that triggers the shared confirmation dialog pattern
- Handles loading, error, and empty-list states

Navigation: clicking "VIEW CAMPAIGN" on a home screen campaign card routes to this view. After deletion, the user is returned to home with a success feedback banner.

### Phase 2 (future, out of scope): Player View

Users who participate in a campaign as players (not DM) would see a read-only version. This requires exposing the `dm` field in `CampaignDto` (currently `@JsonIgnore`) to determine the current user's role.

---

## Scope

### In scope
- `src/pages/ViewCampaign.tsx` — new page component
- `src/services/api.ts` — add `findById` and `remove` to the `campaigns` namespace
- `src/App.tsx` — state, handlers, render branch, and delete dialog for campaigns
- `src/App.css` — visual styles for the view campaign sheet
- `src/App.test.tsx` — integration tests for the full flow
- `src/interfaces/campaign.ts` — add `CampaignParticipant` and `CampaignCharacterReference` types

### Out of scope
- Backend changes — no modifications to Java code
- Edit campaign functionality
- Player-perspective view (Phase 2)
- Assigning characters to a campaign from this view

---

## Approach

- Reuse the exact same confirmation dialog infrastructure already in `App.tsx` for character deletion — no new UI primitives
- Follow the `Characters.tsx` props-and-callbacks pattern for the page component
- `isDungeonMaster` is a boolean prop on `ViewCampaign` — hardcoded to `true` for Phase 1, extensible for Phase 2
- Feedback after deletion flows through `campaignFeedback` (home-level state), same as post-creation feedback

---

## Rollback Plan

All changes are additive frontend-only. Rolling back means:
1. Remove the `ViewCampaign` render branch from `App.tsx`
2. Remove the `view-campaign` case from the `View` union type
3. Remove `handleViewCampaign`, `handleRequestDeleteCampaign`, `handleConfirmDeleteCampaign`, and related state from `App.tsx`
4. Remove `findById` and `remove` from `api.ts`
5. Delete `ViewCampaign.tsx` and the `.view-campaign-*` CSS classes

No database or backend changes to undo.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `GET /campaign/{id}` returns 403 for non-DM users | Low (Phase 1 only loads DM campaigns) | Phase 2 design must handle this |
| `@JsonIgnore` on `dm` field makes Phase 2 harder | Medium | Documented as known constraint |
| Shared delete dialog state conflicts between character and campaign dialogs | Low | Separate state objects (`deleteDialog` vs `deleteCampaignDialog`) |
