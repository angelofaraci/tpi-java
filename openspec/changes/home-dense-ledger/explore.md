# Explore: Home redesign — "Dense Ledger"

## Source

Design handoff (reference-only, not tracked in git, not to be modified):
`design_handoff_home_dense_ledger/README.md` + `design_handoff_home_dense_ledger/home-dense-ledger.html`.

## Current state (corrects the handoff's own assumption)

The handoff assumes today's home lives in `frontend/src/pages/Characters.tsx`. That is
**incorrect** — `Characters.tsx` renders the single character-sheet detail view
(`view === 'character-sheet'`, prop `characterId: number` singular).

The actual home/dashboard is **inline JSX directly inside `frontend/src/App.tsx`**
(the `view === 'home'` / default branch, roughly lines 684–1235 of a 1343-line file),
built from four stacked sections (Characters, Campaigns as DM, Campaigns as Player,
Public Campaigns) with inline `style={{}}` objects — not an extracted component. This
is the same file that owns all cross-view state (25+ `useState` hooks, dialogs, view
routing via `setView`).

Confirmed: Tailwind 4 via `@tailwindcss/postcss` (`frontend/postcss.config.js`), no
react-router dependency, no Google Fonts `<link>` in `frontend/index.html`, no
`public/fonts` convention — font self-hosting is greenfield.

## Data-gap feasibility (vs. handoff's Plan B table)

| Data gap | Verdict |
|---|---|
| `currentHp`/`maxHp` | Plan B — `CharacterStats` has a single `hp: number`, no split. |
| `subclass` | Plan B — no matches anywhere in the repo. |
| `sessionNumber` | Plan B — no matches anywhere in the repo. |
| Next-session date/time (metric tile 5) | Plan B — tile dropped per handoff's own rule (metrics bar becomes 4 tiles). |
| `playerCount`/`characterCount` per campaign | **Needs backend change (small-medium)** — see below. |

## playerCount/characterCount — correcting the handoff

`GET /campaign/{id}` (`CampaignController.getCampaign` → `CampaignDetailDto`) returns
full `players[]`/`characters[]`; `ViewCampaign.tsx` computes `.length` client-side.
The counting itself is **not** a trivial `players.size()`: `CampaignController`'s
private `mapToDetail()` unions explicit `campaign_players` join-table rows with users
derived from `characters[].user`, deduped by id — so a DM who owns a character but
isn't in the join table still counts.

The list endpoints the home actually calls — `GET /campaigns/mine`
(`CampaignSummaryDto`) and `GET /campaigns/as-player` (`PlayerCampaignSummaryDto`) —
have **zero** count fields today. Adding counts to the list endpoints without reusing
the exact union logic risks numbers that visibly disagree with `ViewCampaign` for the
same campaign.

**Decision (user-confirmed):** extract the union-count logic out of
`CampaignController` into a reusable `CampaignService` method, and expose it on both
list DTOs. Backend is in scope for this change.

## Token collision (index.css)

`frontend/src/index.css` already declares an `@theme` block used by the whole app:

```css
@theme {
  --color-background: #09090b;
  --color-surface: #18181b;
  --color-border: #27272a;
  --color-muted: #3f3f46;
  --color-foreground: #fafafa;
  --color-foreground-muted: #a1a1aa;
}

* { border-color: var(--color-border); }
```

The handoff's new `@theme` block reuses these exact variable names
(`--color-surface`, `--color-border`, `--color-muted`, …) with different values and
different semantics (`--color-muted` shifts from a surface tone to a text-dim tone).
Pasting it as-is would repaint the entire app (login, character sheet, admin) via the
global `* { border-color: var(--color-border) }` reset — directly contradicting the
handoff's own "Out of scope: don't fix other screens along the way" note.

**Decision (user-confirmed):** namespace the new design's tokens under distinct names
(e.g. `--home-surface`, `--home-border`, `--home-ink-900`, …) instead of reusing the
existing global token names. The home renders exactly per the mock; no other screen
changes.

## Other real (smaller) findings

- `CopyCodeButton.tsx` only has `sm` (28px) / `md` (36px) sizes — no 12px variant.
  "Reuse as-is" needs a small real change (new size variant).
- `scoreBox.tsx` is a full card component with its own CSS; the compact `readonly`
  STR–CHA strip needs genuine new layout, not a prop flip.

## Files: handoff's table vs. reality

| File | Handoff said | Reality |
|---|---|---|
| `frontend/src/pages/Characters.tsx` | rewrite | **not touched** — it's the character-sheet page, out of scope |
| `frontend/src/App.tsx` | add top bar shell | touched, but larger: home body (~550 lines) replaced + top bar added |
| `frontend/src/index.css` | append `@theme` | needs namespaced tokens, not a clean append |
| `frontend/src/components/CharacterCard.tsx` | new | confirmed new |
| `frontend/src/components/CampaignRailCard.tsx` | new | confirmed new |
| `frontend/src/components/MetricTile.tsx` | new | confirmed new |
| `frontend/src/components/scoreBox.tsx` | add readonly variant | confirmed, real layout work |
| `frontend/src/components/CopyCodeButton.tsx` | reuse as-is | needs new size variant |
| Backend: `CampaignSummaryDto.java`, `PlayerCampaignSummaryDto.java`, `CampaignService.java`, `CampaignController.java` | not mentioned | **new backend touch**, required for accurate counts |

## Confirmed user decisions going into proposal

1. Backend change for playerCount/characterCount: **yes**, small/medium scope.
2. Token collision: **namespace new tokens** under design-specific names; existing
   global tokens and all other screens stay untouched.
