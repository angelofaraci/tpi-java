# Technical Design: Campaign Detail View

**Change**: view-campaign  
**Date**: 2026-03-31  
**Status**: completed (retroactive)

---

## Architecture Overview

This change is purely frontend. No backend modifications are required for Phase 1.

```
App.tsx (controller)
├── State: selectedCampaignId, deletingCampaignId, deleteCampaignDialog,
│         campaignViewError, campaignViewFeedback
├── Handlers: handleViewCampaign, handleRequestDeleteCampaign,
│             handleCloseDeleteCampaignDialog, handleConfirmDeleteCampaign
└── Render branch: view === 'view-campaign' && selectedCampaignId
    └── <ViewCampaign> (presentational page component)

api.ts
└── campaigns.findById(id)   → GET /campaign/{id}
    campaigns.remove(id)     → DELETE /campaign/{id}
```

---

## Component Design: `ViewCampaign`

### Props Interface

```typescript
interface ViewCampaignProps {
  campaignId: number          // ID to fetch
  isDungeonMaster: boolean    // Controls DM-only UI (role strip, delete button)
  onBack: () => void
  onLogout: () => void
  onDeleteCampaign: (campaignId: number, campaignName: string) => void
  deletingCampaignId: number | null   // Passed down for button disable state
  deleteError: string | null          // Error from parent's delete attempt
  feedback?: string | null            // Post-action message shown inside the view
  onDismissFeedback?: () => void
}
```

### Internal State

```typescript
const [campaign, setCampaign] = useState<Campaign | null>(null)
const [loading, setLoading]   = useState(true)
const [error, setError]       = useState<string | null>(null)
```

### Data Fetch

On mount (and when `campaignId` changes), the component calls `api.campaigns.findById(campaignId)` inside a `useEffect`. Loading and error states are managed locally — they are NOT lifted to `App.tsx`.

### Render States

```
loading === true          → <div className="loading-container">Loading campaign...</div>
error !== null            → error view with back button
campaign === null         → null (unreachable in practice after loading resolves)
campaign !== null         → full detail layout
```

---

## State Management in App.tsx

### New View Type Entry

```typescript
type View = 'home' | 'character-sheet' | 'create-campaign' | 'create-character'
           | 'view-campaign'   // ← added
           | 'admin'
```

### New State Variables

| State | Type | Purpose |
|-------|------|---------|
| `selectedCampaignId` | `number \| null` | Which campaign is being viewed |
| `deletingCampaignId` | `number \| null` | Which campaign is being deleted (disables button) |
| `deleteCampaignDialog` | `DeleteCampaignDialogState \| null` | Controls confirmation dialog |
| `campaignViewError` | `string \| null` | Delete error shown inside the view |
| `campaignViewFeedback` | `string \| null` | Success message inside view (unused in Phase 1 — deletion exits the view) |

### Handler Flow: Delete Campaign

```
User clicks "Delete Campaign" (in ViewCampaign)
  → onDeleteCampaign(campaignId, campaignName)
  → App.handleRequestDeleteCampaign
  → setDeleteCampaignDialog({ campaignId, campaignName })
  → Dialog renders

User clicks "Delete campaign" (in dialog)
  → App.handleConfirmDeleteCampaign()
  → setDeletingCampaignId(campaignId)
  → await api.campaigns.remove(campaignId)

  On success:
    → setDeleteCampaignDialog(null)
    → setCampaigns(current => current.filter(c => c.id !== campaignId))  // optimistic removal
    → setView('home')
    → setCampaignFeedback(`Campaign "${campaignName}" deleted successfully.`)

  On error:
    → setCampaignViewError(message)  // stays on view

  Finally:
    → setDeletingCampaignId(null)
```

---

## API Layer

### Added Methods

```typescript
// src/services/api.ts — campaigns namespace

findById: async (id: number): Promise<Campaign> => {
  const response = await fetch(`${BASE_URL}/campaign/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json()
},

remove: async (id: number): Promise<void> => {
  await fetch(`${BASE_URL}/campaign/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
},
```

---

## Architecture Decision Records

### ADR-01: `isDungeonMaster` as a prop (not derived from API)

**Decision**: Pass `isDungeonMaster: boolean` as a prop to `ViewCampaign` rather than deriving it from the API response.

**Reason**: `CampaignDto.dm` is `@JsonIgnore` — the backend never exposes DM identity in the response. For Phase 1, all campaigns navigated from `/campaigns/mine` are owned by the current user, so `isDungeonMaster = true` is always correct.

**Consequence**: Phase 2 (player view) will need to either (a) remove `@JsonIgnore` from `CampaignDto.dm` and pass the real value, or (b) compare the DM's id against `currentUserId` in `App.tsx`.

---

### ADR-02: Confirmation dialog lives in App.tsx, not in ViewCampaign

**Decision**: The delete campaign confirmation dialog is rendered at the root `App.tsx` level (same as the character delete dialog), not inside `ViewCampaign`.

**Reason**: Consistency with the existing character deletion pattern. Dialogs rendered at root level avoid z-index and portal issues, and keep page components stateless.

**Trade-off**: `ViewCampaign` never directly controls its own deletion flow — it just calls `onDeleteCampaign`. This means the campaign detail view and the confirmation dialog share state through props, adding some prop-threading. Acceptable for this project's scale.

---

### ADR-03: Optimistic campaign removal from home list

**Decision**: On successful delete, immediately filter the campaign out of `campaigns` state without re-fetching the list from the backend.

**Reason**: Consistent with the existing character deletion behavior (same pattern). The home list was populated from a known good state; removing one item locally is always correct after a successful DELETE.

**Risk**: If deletion fails silently and the API returns 200 but didn't actually delete, the UI would show an outdated state. Acceptable for current project scope.

---

## Sequence Diagram: Delete Campaign Flow

```
User         ViewCampaign     App.tsx           api.ts          Backend
  |               |              |                 |                |
  |--click        |              |                 |                |
  |"Delete        |              |                 |                |
  | Campaign"--->|              |                 |                |
  |               |--onDelete-->|                 |                |
  |               |   Campaign  |                 |                |
  |               |             |--setDialog----->|                |
  |               |             |  (dialog opens) |                |
  |               |             |                 |                |
  |--click        |             |                 |                |
  |"Delete        |             |                 |                |
  | campaign"---->|             |                 |                |
  |               |             |--handleConfirm->|                |
  |               |             |                 |--DELETE------->|
  |               |             |                 |<--204----------
  |               |             |--filter list    |                |
  |               |             |--setView(home)  |                |
  |               |             |--setCampaign    |                |
  |               |             |  Feedback(...)  |                |
```

---

## CSS Structure

New CSS classes added to `App.css`:

| Class | Role |
|-------|------|
| `.view-campaign-sheet` | Outer wrapper for the full detail layout |
| `.view-campaign-hero` | Top section (name, badge, date, description, stats) |
| `.view-campaign-hero-content` | Left sub-section of the hero |
| `.view-campaign-title` | H2 for the campaign name |
| `.view-campaign-date` | Styled date paragraph |
| `.view-campaign-description` | Description paragraph |
| `.view-campaign-stats-row` | Flex row for stat cards |
| `.view-campaign-stat-card` | Individual stat card (count + label) |
| `.view-campaign-stat-value` | Large number inside a stat card |
| `.view-campaign-stat-label` | Uppercase label inside a stat card |
| `.view-campaign-role-strip` | DM role indicator bar |
| `.view-campaign-columns` | Two-column grid for panels |
| `.view-campaign-panel` | Individual content panel (Players / Characters) |
| `.view-campaign-list` | Unstyled list inside a panel |
| `.view-campaign-list-item` | Flex row per list item |
| `.view-campaign-list-icon` | Emoji icon in a list item |
| `.view-campaign-list-primary` | Primary text (username / Character #id) |
| `.view-campaign-list-secondary` | Secondary text (email) |
| `.view-campaign-empty` | Muted empty state paragraph |
