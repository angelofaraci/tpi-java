# Specification: Campaign Detail View

**Change**: view-campaign  
**Date**: 2026-03-31  
**Status**: completed (retroactive)

---

## Requirements

### REQ-01 — Navigation to Detail View

The system MUST provide a way to navigate from a campaign card on the home screen to the campaign detail view.

**Trigger**: Clicking the "VIEW CAMPAIGN" button on any owned campaign card.  
**Precondition**: User is authenticated and has at least one campaign visible in the home screen.

---

### REQ-02 — Campaign Detail Fetch

The `ViewCampaign` component MUST fetch campaign data from `GET /campaign/{id}` on mount.

The component MUST display:
- Loading indicator while the request is in flight
- Error message if the request fails
- Campaign content when the request succeeds

---

### REQ-03 — Campaign Content Display

The detail view MUST render:
- Campaign name (as a heading)
- Privacy badge (`Public` or `Private` based on `privacy: boolean`)
- Formatted creation date (e.g. `November 29, 2025`, UTC, en-US locale)
- Campaign description (if present)
- Player count and character count as stat cards
- A "ROLE: DUNGEON MASTER" strip (only when `isDungeonMaster` is `true`)

---

### REQ-04 — Player Roster

The detail view MUST display the players panel with:
- Username and email per player
- An empty state message when `players` is empty: `"No players have joined this campaign yet."`

---

### REQ-05 — Character Roster

The detail view MUST display the characters panel with:
- Character reference per entry (`Character #<id>`)
- An empty state message when `characters` is empty: `"No characters assigned to this campaign yet."`

---

### REQ-06 — Delete Campaign Action (DM only)

When `isDungeonMaster` is `true`, the detail view MUST show a "Delete Campaign" button.

Clicking the button MUST open a confirmation dialog with:
- Heading: `Delete <campaignName>?`
- A descriptive warning message
- Two actions: "Cancel" and "Delete campaign"

---

### REQ-07 — Delete Campaign Confirmation

When the user confirms deletion:
- `DELETE /campaign/{id}` MUST be called
- On success: the user MUST be returned to the home screen, the campaign card MUST be removed from the list, and a feedback banner MUST appear: `Campaign "<campaignName>" deleted successfully.`
- On failure: an error message MUST appear in the detail view WITHOUT navigating away
- While deleting: the "Delete campaign" button MUST be disabled

---

### REQ-08 — Cancel Delete Dialog

When the user clicks "Cancel" in the delete dialog:
- The dialog MUST close
- The user MUST remain on the campaign detail view
- No API call MUST be made

---

### REQ-09 — Back Navigation

The detail view MUST provide a "← Back to Home" button that returns the user to the home screen without any API side effects.

---

### REQ-10 — Feedback Dismissal

A feedback banner shown on the home screen after successful deletion MUST be dismissable.

---

## Scenarios

### Scenario 1 — Navigate to detail view

```
Given the user is on the home screen
  And at least one owned campaign is visible
When the user clicks "VIEW CAMPAIGN" on a campaign card
Then the application navigates to the campaign detail view
  And a loading indicator is displayed while the API call is in flight
  And api.campaigns.findById is called with the campaign's id
```

### Scenario 2 — Render campaign metadata

```
Given the campaign detail has loaded successfully
  And the campaign is public with a known creation date
When the detail view is rendered
Then the campaign name is displayed as a heading
  And the "Public" badge is visible
  And the creation date is formatted in long en-US UTC format (e.g. "November 29, 2025")
  And the description text is visible
  And the player and character count stat cards are visible
```

### Scenario 3 — Render player list

```
Given the campaign detail has players [alice, bob]
When the detail view is rendered
Then each player's username is visible
  And each player's email is visible
```

### Scenario 4 — Empty player and character lists

```
Given the campaign detail has no players and no characters
When the detail view is rendered
Then "No players have joined this campaign yet." is displayed
  And "No characters assigned to this campaign yet." is displayed
```

### Scenario 5 — Loading state

```
Given the API call to GET /campaign/{id} has not yet resolved
When the detail view is mounted
Then "Loading campaign..." is displayed
```

### Scenario 6 — Error state

```
Given the API call to GET /campaign/{id} rejects with "Error 503: Service unavailable"
When the error occurs
Then "Error: Error 503: Service unavailable" is displayed
  And the user can still navigate back to home
```

### Scenario 7 — Back to home

```
Given the user is on the campaign detail view
When the user clicks "← Back to Home"
Then the home screen is rendered
  And the campaign detail view is unmounted
```

### Scenario 8 — Open delete dialog

```
Given the user is a Dungeon Master viewing the campaign detail
When the user clicks "Delete Campaign"
Then a confirmation dialog opens
  And the dialog heading reads "Delete <campaignName>?"
```

### Scenario 9 — Cancel delete dialog

```
Given the delete confirmation dialog is open
When the user clicks "Cancel"
Then the dialog closes
  And the user remains on the campaign detail view
  And no API call is made
```

### Scenario 10 — Confirm delete and return to home

```
Given the delete confirmation dialog is open
When the user clicks "Delete campaign"
Then api.campaigns.remove is called with the campaign id
  And on success, the home screen is rendered
  And the deleted campaign card is no longer visible
  And a feedback banner reads "Campaign '<campaignName>' deleted successfully."
```

### Scenario 11 — Campaign removed from home list after deletion

```
Given the campaign appeared in the home screen campaign list
When the campaign is successfully deleted from the detail view
Then the campaign is no longer present in the campaign list on the home screen
```
