# Implementation Tasks: Campaign Detail View

**Change**: view-campaign  
**Date**: 2026-03-31  
**Status**: completed (retroactive)

---

## Phase 1 — API Layer

- [x] **1.1** Add `findById(id: number)` to `api.campaigns` in `src/services/api.ts`
  - Calls `GET /campaign/{id}` with Bearer token
  - Returns `Promise<Campaign>`

- [x] **1.2** Add `remove(id: number)` to `api.campaigns` in `src/services/api.ts`
  - Calls `DELETE /campaign/{id}` with Bearer token
  - Returns `Promise<void>`

- [x] **1.3** Add `findById` and `remove` mocks to the `api` mock in `src/App.test.tsx`

---

## Phase 2 — Interface Types

- [x] **2.1** Add `CampaignParticipant` interface to `src/interfaces/campaign.ts`
  - Fields: `id: number`, `username?: string`, `email?: string`

- [x] **2.2** Add `CampaignCharacterReference` interface to `src/interfaces/campaign.ts`
  - Fields: `id: number`

- [x] **2.3** Add `players` and `characters` fields to the `Campaign` interface in `src/interfaces/campaign.ts`
  - `players?: CampaignParticipant[]`
  - `characters?: CampaignCharacterReference[]`

---

## Phase 3 — Page Component

- [x] **3.1** Create `src/pages/ViewCampaign.tsx`
  - Define `ViewCampaignProps` interface
  - Implement `formatDate(dateString)` utility (UTC, en-US long format)
  - Implement data fetch in `useEffect` on `campaignId`
  - Implement loading render branch
  - Implement error render branch (with back button and logout)
  - Implement full content render branch

- [x] **3.2** Render campaign hero section
  - Privacy badge (`Public` / `Private`)
  - Campaign name as `<h2>`
  - Formatted creation date
  - Description (conditional)

- [x] **3.3** Render stats row
  - Player count card
  - Character count card

- [x] **3.4** Render DM role strip (conditional on `isDungeonMaster`)

- [x] **3.5** Render Players panel
  - Player list with username + email
  - Empty state message

- [x] **3.6** Render Characters panel
  - Character list with `Character #<id>`
  - Empty state message

- [x] **3.7** Render DM actions bar (conditional on `isDungeonMaster`)
  - "Delete Campaign" button — calls `onDeleteCampaign`, disabled while `deletingCampaignId === campaignId`

- [x] **3.8** Render feedback banner (dismissable, conditional on `feedback`)

- [x] **3.9** Render delete error message (conditional on `deleteError`)

---

## Phase 4 — App.tsx Wiring

- [x] **4.1** Add `'view-campaign'` to the `View` union type

- [x] **4.2** Add state variables
  - `selectedCampaignId: number | null`
  - `deletingCampaignId: number | null`
  - `deleteCampaignDialog: DeleteCampaignDialogState | null`
  - `campaignViewError: string | null`
  - `campaignViewFeedback: string | null`

- [x] **4.3** Add `DeleteCampaignDialogState` interface (`campaignId`, `campaignName`)

- [x] **4.4** Implement `handleViewCampaign(campaignId: number)`
  - Sets `selectedCampaignId` and `view = 'view-campaign'`
  - Clears `campaignViewFeedback` and `campaignViewError`

- [x] **4.5** Implement `handleRequestDeleteCampaign(campaignId, campaignName)`
  - Sets `deleteCampaignDialog`
  - Clears `campaignViewError`

- [x] **4.6** Implement `handleCloseDeleteCampaignDialog()`
  - No-op if `deletingCampaignId !== null`
  - Sets `deleteCampaignDialog = null`

- [x] **4.7** Implement `handleConfirmDeleteCampaign()` (async)
  - Guard: early return if `deleteCampaignDialog` is null
  - Sets `deletingCampaignId`
  - Calls `api.campaigns.remove(campaignId)`
  - On success: closes dialog, filters campaigns list, navigates to home, sets feedback
  - On error: sets `campaignViewError`
  - Finally: clears `deletingCampaignId`

- [x] **4.8** Add `VIEW CAMPAIGN` button to campaign cards in home view
  - Calls `handleViewCampaign(campaign.id)` on click

- [x] **4.9** Add `DELETE` button to campaign cards in home view (direct card action)
  - Calls `handleRequestDeleteCampaign(campaign.id, campaign.name)` on click

- [x] **4.10** Add `view === 'view-campaign' && selectedCampaignId` render branch
  - Renders `<ViewCampaign>` with all required props

- [x] **4.11** Add delete campaign confirmation dialog at root render level
  - Renders when `deleteCampaignDialog !== null`
  - Uses `role="dialog"` pattern consistent with character delete dialog

- [x] **4.12** Reset campaign-related state in `handleLogout` and `handleBackToHome`

---

## Phase 5 — Styles

- [x] **5.1** Add `.view-campaign-sheet`, `.view-campaign-hero`, `.view-campaign-hero-content` to `App.css`
- [x] **5.2** Add `.view-campaign-title`, `.view-campaign-date`, `.view-campaign-description`
- [x] **5.3** Add `.view-campaign-stats-row`, `.view-campaign-stat-card`, `.view-campaign-stat-value`, `.view-campaign-stat-label`
- [x] **5.4** Add `.view-campaign-role-strip`
- [x] **5.5** Add `.view-campaign-columns`, `.view-campaign-panel`
- [x] **5.6** Add `.view-campaign-list`, `.view-campaign-list-item`, `.view-campaign-list-icon`, `.view-campaign-list-primary`, `.view-campaign-list-secondary`
- [x] **5.7** Add `.view-campaign-empty`
- [x] **5.8** Add mobile responsive overrides (`@media (max-width: 640px)`)

---

## Phase 6 — Tests

- [x] **6.1** Add `describe('App view campaign flow')` block to `src/App.test.tsx`
  - Dedicated `beforeEach` with `mockCampaignDetail` fixture (players: alice, bob; characters: #31, #44)

- [x] **6.2** Test: navigate to detail view on VIEW CAMPAIGN click
- [x] **6.3** Test: render campaign name, badge, date, description, and stats
- [x] **6.4** Test: render players list with username and email
- [x] **6.5** Test: render characters list with `Character #<id>` labels
- [x] **6.6** Test: empty state messages when no players or characters
- [x] **6.7** Test: loading state while fetch is pending
- [x] **6.8** Test: error state when fetch fails
- [x] **6.9** Test: back to home navigation
- [x] **6.10** Test: delete dialog opens on Delete Campaign click
- [x] **6.11** Test: cancel button closes dialog and stays on view
- [x] **6.12** Test: confirm delete → home screen + success feedback
- [x] **6.13** Test: campaign card removed from home list after deletion

---

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run` — new tests pass | ✅ 11/11 |
| `npx vitest run` — no new failures introduced | ✅ 8 pre-existing failures unchanged |
| All spec scenarios covered by tests | ✅ Scenarios 1–11 mapped to tests 6.2–6.13 |
| TypeScript compiles without errors | ✅ |
