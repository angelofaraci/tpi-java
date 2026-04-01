# Exploration: Campaign Detail View

**Change**: view-campaign  
**Date**: 2026-03-31  
**Status**: completed

---

## Goal

Understand the existing codebase well enough to add a campaign detail view screen without breaking existing patterns or introducing backend changes.

---

## Backend Investigation

### Endpoints Available

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/mine` | Returns campaigns where authenticated user is DM |
| GET | `/campaign/{id}` | Returns full campaign detail |
| DELETE | `/campaign/{id}` | Deletes a campaign by ID |

### DTO Analysis

**`CampaignSummaryDto`** (returned by `/campaigns/mine`):
```
id, name, description, privacy (boolean), creationDate (ISO string), playerCount (int)
```

**`CampaignDto`** (returned by `/campaign/{id}`):
```
id, name, description, privacy, creationDate,
players: List<UserDto> { id, username, email },
characters: List<CharacterDto> { id, ... }
```

**Critical discovery**: `CampaignDto.dm` is annotated `@JsonIgnore` — the DM identity is **never exposed** in the API response. This means the frontend cannot determine if the current user is the DM by inspecting the response.

### Workaround for Phase 1

Since `/campaigns/mine` already filters to campaigns where the current user IS the DM, `isDungeonMaster` can be safely hardcoded to `true` when navigating from that route. Phase 2 (player view) would require a backend change.

---

## Frontend Investigation

### Existing Patterns

**Navigation model** (`App.tsx`):
- Single `view` state of type `View` (union string literal)
- Selected entity ID stored separately (`selectedCharacterId`)
- All API calls go through `src/services/api.ts`
- Page components are stateless presentational components that receive callbacks via props

**Confirmation dialog pattern** (`App.tsx` lines 804–832):
- Shared `deleteDialog` state with `characterId` + `characterName`
- Backdrop + dialog rendered at root level (not inside the page component)
- Cancel button is disabled while deletion is in progress

**Character sheet pattern** (`Characters.tsx`):
- Component receives `characterId`, `onBack`, `onLogout`, `onDeleteCharacter`, `deletingCharacterId`, `deleteError`, `feedback`, `onDismissFeedback` as props
- Fetches its own data on mount via `useEffect`
- Shows loading, error, and content states

**Feedback pattern** (`App.tsx`):
- `campaignFeedback` state shown on the home view via a dismissable `role="status"` banner
- `characterSheetFeedback` state shown inside the character sheet view

### Files to Create/Modify

| File | Action | Reason |
|------|--------|--------|
| `src/pages/ViewCampaign.tsx` | CREATE | New page component |
| `src/services/api.ts` | MODIFY | Add `findById` and `remove` to campaigns |
| `src/App.tsx` | MODIFY | Add view state, handlers, render branch, delete dialog |
| `src/App.css` | MODIFY | Add `.view-campaign-*` styles |
| `src/App.test.tsx` | MODIFY | Add new describe block for the view campaign flow |

### Interface Gaps

The existing `Campaign` interface in `src/interfaces/campaign.ts` needed `players` and `characters` fields. Added:
```typescript
interface CampaignParticipant { id: number; username?: string; email?: string }
interface CampaignCharacterReference { id: number }
```

---

## Key Constraints

1. **No backend changes** — the `@JsonIgnore` on `dm` is a known limitation; Phase 1 works around it
2. **Same confirmation dialog pattern** as character delete — reuse the visual and behavioral pattern
3. **Separate feedback states** — `campaignViewFeedback` for in-view messages, `campaignFeedback` for home-view messages post-deletion
4. **Race condition safety** — `latestCampaignRequestId` ref pattern already exists and is reused
5. **2 pre-existing test failures** — `CreateCharacter.test.tsx` has `Arcana` label and `Arcane scholar` text failures that predate this change
