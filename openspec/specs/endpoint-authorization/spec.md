# Endpoint Authorization Specification

## Purpose

Defines who MAY mutate campaigns, character stats, levels, and the D&D class
catalog, and the exact HTTP status codes each mutating endpoint MUST return
for owner/DM/admin, non-owner authenticated, and missing-resource cases.

## Requirements

### Requirement: Campaign mutation is DM-only

The system MUST allow `DELETE`, `PUT`, and `PATCH campaign/{id}` only for
the campaign's DM. A non-DM authenticated user MUST receive `403`. A missing
campaign MUST return `404` before any ownership check.

#### Scenario: DM deletes their campaign

- GIVEN an authenticated user who is the DM of campaign `{id}`
- WHEN they call `DELETE campaign/{id}` (no characters attached)
- THEN the response is `200` or `204` and the campaign is removed

#### Scenario: Non-DM user attempts to update a campaign

- GIVEN an authenticated user who is NOT the DM of campaign `{id}`
- WHEN they call `PUT` or `PATCH campaign/{id}`
- THEN the response is `403` and the campaign is unchanged

#### Scenario: Mutation on a missing campaign

- GIVEN no campaign exists with `{id}`
- WHEN an authenticated user calls `DELETE`, `PUT`, or `PATCH campaign/{id}`
- THEN the response is `404`

### Requirement: Character-stats mutation is owner-or-campaign-DM

The system MUST allow `PUT`, `PATCH`, `DELETE /character-stats/{id}` and
`PUT /character-stats/{id}/{classId}` (HP update) only for the owner of the
parent character (via `CharacterStatsEntity.character`) or that character's
campaign DM, using the existing `canEdit` check. A non-owner/non-DM
authenticated user MUST receive `403`. A missing character-stats resource
MUST return `404`, including for `DELETE` (currently unchecked).

#### Scenario: Owner updates their character stats

- GIVEN an authenticated user who owns the character linked to
  character-stats `{id}`
- WHEN they call `PUT` or `PATCH /character-stats/{id}`
- THEN the response is `200` and the stats are updated

#### Scenario: Campaign DM updates a player's HP

- GIVEN an authenticated user who is the DM of the campaign owning the
  character linked to character-stats `{id}`
- WHEN they call `PUT /character-stats/{id}/{classId}`
- THEN the response is `200`

#### Scenario: Non-owner, non-DM user attempts any mutation

- GIVEN an authenticated user who is neither the character owner nor the
  campaign DM for character-stats `{id}`
- WHEN they call `PUT`, `PATCH`, `DELETE /character-stats/{id}`, or
  `PUT /character-stats/{id}/{classId}`
- THEN the response is `403` and the resource is unchanged

#### Scenario: Delete on a missing character-stats resource

- GIVEN no character-stats resource exists with `{id}`
- WHEN an authenticated user calls `DELETE /character-stats/{id}`
- THEN the response is `404`

### Requirement: Level mutation is owner-or-campaign-DM

The system MUST allow `PUT`, `PATCH`, `DELETE /level/{characterId}/{classId}`
only for the owner of character `{characterId}` or that character's campaign
DM, using the existing `canEdit` check. A non-owner/non-DM authenticated user
MUST receive `403`. A missing character MUST return `404`, including for
`DELETE` (currently unchecked).

#### Scenario: Owner updates their level

- GIVEN an authenticated user who owns character `{characterId}`
- WHEN they call `PUT` or `PATCH /level/{characterId}/{classId}`
- THEN the response is `200`

#### Scenario: Non-owner, non-DM user attempts any mutation

- GIVEN an authenticated user who is neither the owner of `{characterId}`
  nor its campaign DM
- WHEN they call `PUT`, `PATCH`, or `DELETE /level/{characterId}/{classId}`
- THEN the response is `403` and the level is unchanged

#### Scenario: Delete on a missing character

- GIVEN no character exists with `{characterId}`
- WHEN an authenticated user calls `DELETE /level/{characterId}/{classId}`
- THEN the response is `404`

### Requirement: Level creation requires a reachable, authorized character id

The system MUST require `POST /levels` requests to carry a parent character id
(`LevelDto.character.id`). A request without it MUST return `400`. The system
MUST allow the create only for the owner of that character or its campaign DM,
using the existing `canEdit` check. A non-owner/non-DM authenticated user MUST
receive `403`. A missing character MUST return `404`.

#### Scenario: Owner creates a level for their character

- GIVEN an authenticated user who owns character `{characterId}`
- WHEN they call `POST /levels` with `character.id = {characterId}`
- THEN the response is `201` and the level is created

#### Scenario: Non-owner, non-DM user attempts to create a level

- GIVEN an authenticated user who is neither the owner of `{characterId}` nor
  its campaign DM
- WHEN they call `POST /levels` with `character.id = {characterId}`
- THEN the response is `403` and no level is created

#### Scenario: Level creation without a character id

- GIVEN an authenticated user
- WHEN they call `POST /levels` with no `character.id` in the payload
- THEN the response is `400`

#### Scenario: Level creation for a missing character

- GIVEN no character exists with `{characterId}`
- WHEN an authenticated user calls `POST /levels` with `character.id = {characterId}`
- THEN the response is `404`

### Requirement: D&D class catalog mutation is admin-only

The system MUST require `hasRole('ADMIN')` for `PATCH` and
`DELETE /dnd-class/{id}`, matching the existing `createDndClass` and
`fullUpdateDndClass` behavior. An authenticated non-admin user MUST receive
`403`.

#### Scenario: Admin patches a D&D class

- GIVEN an authenticated user with `ROLE_ADMIN`
- WHEN they call `PATCH /dnd-class/{id}`
- THEN the response is `200` and the class is updated

#### Scenario: Non-admin user attempts to mutate a D&D class

- GIVEN an authenticated user without `ROLE_ADMIN`
- WHEN they call `PATCH` or `DELETE /dnd-class/{id}`
- THEN the response is `403` and the class is unchanged

### Requirement: DndClassEndpointTests uses an admin principal

`DndClassEndpointTests.patchDndClass_updatesSavingThrows` (and any sibling
PATCH/DELETE test in that file) MUST authenticate as a user with
`ROLE_ADMIN`. A `ROLE_USER` principal calling `PATCH` or
`DELETE /dnd-class/{id}` MUST NOT succeed once the admin-only check is added.

#### Scenario: Regression test asserts admin-only PATCH

- GIVEN `DndClassEndpointTests.patchDndClass_updatesSavingThrows` runs with
  an admin-role test user
- WHEN it calls `PATCH /dnd-class/{id}`
- THEN the response is `200`, matching the requirement above

## Out of Scope

`createCharacterStats` (`POST /character-stats`) is explicitly NOT specified
in this change — `CharacterStatsDto` has no character-id field in any form,
and the underlying entity relation is `nullable = false`, so the endpoint
cannot persist a valid row today regardless of authorization. Deferred to a
follow-up change requiring a DTO/mapper contract decision.
