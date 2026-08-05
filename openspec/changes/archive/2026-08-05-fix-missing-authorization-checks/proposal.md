# Proposal: Fix Missing Authorization Checks (IDOR / Broken Access Control)

**Change**: fix-missing-authorization-checks
**Date**: 2026-08-05
**Status**: proposed

---

## Intent

Twelve mutating backend endpoints accept any authenticated JWT and mutate data the caller
does not own. A plain `ROLE_USER` can today delete another player's campaign, rewrite a
stranger's character stats or levels, and edit the global D&D class catalog. This is
broken access control (IDOR), not a feature gap.

Success: every mutating endpoint on campaigns, character stats, levels, and D&D classes
answers `403` for a non-owner / non-admin and `404` for a missing resource, while owners,
DMs, and admins keep exactly the behavior they have today.

---

## Scope

### In scope

| Controller | Endpoints | Check to add |
|---|---|---|
| `CampaignController` | `DELETE`, `PUT`, `PATCH /campaigns/{id}` | `campaignService.isDm(campaign, principal.getUsername())` |
| `CharacterStatsController` | `PUT`, `PATCH`, `DELETE /{id}`, `PUT /{id}/{classId}` (HP) | `characterStatsService.findOne(id).getCharacter()` → `characterService.canEdit(...)` |
| `LevelController` | `PUT`, `PATCH`, `DELETE /level/{characterId}/{classId}`, `POST /levels` | `characterService.findOne(characterId)` → `canEdit(...)` (POST reads id from `levelDto.getCharacter().getId()`, 400 if absent) |
| `DndClassController` | `PATCH`, `DELETE dnd-class/{id}` | `@PreAuthorize("hasRole('ADMIN')")` |

Also in scope: existence (`404`) checks where currently absent — `CharacterStatsController.deleteCharacterStats`,
`LevelController.deleteLevel`; injecting `CharacterService` into `CharacterStatsController`;
migrating `DndClassEndpointTests.patchDndClass_updatesSavingThrows` (and any sibling) to an
admin principal; regression tests per fixed endpoint mirroring `CharacterDeleteEndpointTests`.

### Out of scope

- `createCharacterStats` (POST /character-stats) — see Open Questions. `createLevel`
  (POST /levels) is resolved and IN scope (see design.md: the parent character id is
  reachable via `LevelDto.character.id`, which the frontend already sends).
- A generic authorization aspect/annotation framework (`@RequireOwnership` + AOP).
- `CharacterController`, `PortraitController`, `RaceController`, `AdminController` — already protected.
- Any DTO, entity, or schema change.

---

## Capabilities

### New Capabilities

- `endpoint-authorization`: who may mutate campaigns, character stats, levels, and the
  D&D class catalog, and the exact status codes for owner / non-owner / missing resource.

### Modified Capabilities

None (`openspec/specs/` is currently empty).

---

## Approach & Rationale

Direct pattern replication (explore.md approach 1): inject
`@AuthenticationPrincipal UserDetails principal`, resolve the entity (404 if empty), call
the **existing** primitive (`CharacterService.canEdit` or `CampaignService.isDm`, 403 if
false), then mutate — the exact shape `CharacterController` L87-154 already uses.

**Constraint from the existing backend contract**: reuse `canEdit` / `isDm` as-is. Do not
invent new authorization primitives, do not introduce AOP. A security hotfix must be
small, obviously correct, and reviewable; a framework is a larger regression surface and
delays remediation.

Implementation is TDD per project convention: a failing 403/404 test per endpoint first.

**Test gate**: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/`.
This is the same gate `.github/workflows/deploy-backend.yml` runs before deploy.

---

## Affected Files

Backend (`backend/src/main/java/com/utn/javaproject/dndsheets/controllers/`):
`CampaignController.java`, `CharacterStatsController.java`, `LevelController.java`,
`DndClassController.java`. Services are read-only consumers — unchanged.

Tests (`backend/src/test/java/com/utn/javaproject/dndsheets/`):
`DndClassEndpointTests.java` (migration, required), plus new authorization test classes.

---

## Open Questions — resolved by design.md

`createCharacterStats`: `CharacterStatsDto` has no character-id field in any form, and
`CharacterStatsEntity.character` is `nullable = false`, so the endpoint cannot persist a
valid row today regardless — **deferred** to a follow-up change (DTO/mapper contract
change needed; out of hotfix risk budget).

`createLevel`: `LevelDto.character` (a `CharacterDto`) already carries the id, and the
frontend already sends it — **fixed in this change**, not deferred.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `DndClassController` PATCH fix breaks `DndClassEndpointTests` | **High (certain)** | CI red | Test migration to an admin principal is explicitly in scope, not optional |
| A legitimate DM/owner flow starts returning 403 (over-restriction) | Medium | Regression | Reuse `isDm`/`canEdit` unchanged; add a positive-path test alongside each 403 test |
| Frontend surfaces new 403s it does not handle | Low | UX | Callers were already unauthorized; no legitimate frontend flow should hit these paths |
| POST endpoints remain unprotected after this change | Medium | Residual exposure | Explicitly tracked above; must be closed by a follow-up change |

---

## Rollback Plan

Purely additive — checks are added, no functionality removed, no DTO/entity/schema change,
no data migration. Rollback is a straight `git revert` of the commit/PR. Already-stored
data is untouched and unaffected in either direction.

---

## Success Criteria

- [ ] Each in-scope endpoint returns `403` for an authenticated non-owner / non-admin.
- [ ] Each in-scope endpoint returns `404` for a non-existent resource.
- [ ] Owner, DM, and admin behavior is unchanged (positive-path test per endpoint).
- [ ] `./mvnw test` is green from `backend/`, including the migrated `DndClassEndpointTests`.

---

## Next Recommended

`sdd-spec` and `sdd-design` (parallel). Spec: Given/When/Then + RFC 2119 per endpoint with
explicit status codes. Design: the POST character-id threading decision and the
`CharacterService` injection into `CharacterStatsController`.
