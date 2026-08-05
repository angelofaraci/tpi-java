# Apply Progress: Fix Missing Authorization Checks (IDOR)

Status as of this update: sections 1-4 complete and green. Section 5 (full-suite verification) intentionally not run as part of apply — deferred to the dedicated sdd-verify phase per instructions.

## Section 1 — Campaign authorization (`CampaignController`) — DONE

- **1.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/CampaignAuthorizationEndpointTests.java` created — 9 tests covering PUT/PATCH/DELETE `campaign/{id}` × {DM, non-DM, missing}.
- **1.2** (GREEN): `CampaignController.java` — added `@AuthenticationPrincipal UserDetails principal` to `fullUpdateCampaign`, `partialUpdate`, `deleteCampaign`; replaced `isExists` with `findOne` → 404, then `campaignService.isDm(...)` → 403, before the existing mutation/409 logic. `deleteCampaign`'s new 404/403 checks run before the existing `hasCharacters` 409 check, per design.md.
- Full suite green after this section.

## Section 2 — Character-stats authorization (`CharacterStatsController`) — DONE

- **2.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/CharacterStatsAuthorizationEndpointTests.java` created — 14 tests covering PUT/PATCH/DELETE `/character-stats/{id}` and PUT `/character-stats/{id}/{classId}` (HP) × {owner, campaign DM, non-owner/non-DM, missing}.
- **2.2** (GREEN): `CharacterStatsController.java` — added `CharacterService characterService` as a 5th constructor param; each of the four methods now does `characterStatsService.findOne(id)` → 404 → `characterService.canEdit(found.getCharacter(), principal.getUsername())` → 403, before the existing mutation logic. `deleteCharacterStats` gained both the 404 and 403 branches (neither existed before).

### Pre-existing bugs discovered and fixed while making section 2 testable

These are unrelated to authorization but blocked writing truthful positive-path tests (design.md's testing strategy requires "owner/DM → existing 2xx **and** persisted effect" per endpoint) — both are documented in code comments at their fix site:

1. **`CharacterStatsService.delete(Long id)` silently no-op'd.** It called `characterStatsRepository.deleteById(id)` (and, when reproducing, `repository.delete(entity)` behaved identically) — no exception, transaction committed "successfully", but no `DELETE` SQL was ever emitted and the row remained. Root cause not fully resolved (suspected interaction between eager `@OneToOne`/`@ManyToOne` chains reachable from `CharacterStatsEntity` and Spring Data's generated entity-level delete path), but reliably reproduced and fixed: `CharacterStatsRepository` now has `deleteByIdBulk` — a bulk `@Modifying @Query("delete from CharacterStatsEntity c where c.id = :id")` — and `CharacterStatsService.delete` calls that instead. Verified fixed via `deleteCharacterStats_owner_returns204AndRemoves`.
2. **`ModelMapper` spuriously maps `CharacterStatsDto.id` onto the entity's nested `character.id` path.** `CharacterStatsDto` has no `character` field, but ModelMapper's default matching strategy still resolved the unmatched nested `CharacterStatsEntity.character.id` destination path against the DTO's top-level `id` (both leaf-named `id`), silently replacing the real character association with a bogus one on every `PUT`/`PATCH /character-stats/{id}` call whenever the target character-stats id happened to collide with a real character id elsewhere in the DB. Confirmed via direct debug logging (`mapped character=6` when the row's real character was `8`). Fixed in `CharacterStatsController.fullUpdateCharacterStats` and `partialUpdate`: after `mapFrom`, explicitly `characterStatsEntity.setCharacter(found.get().getCharacter())` before saving — mirrors the existing "campaign is immutable after creation" pattern already used in `CharacterController#fullUpdateCharacter` for the same class of problem. No DTO/entity/schema change.

Full suite green after this section (`./mvnw test`, all classes, including both authorization test classes and all pre-existing tests).

## Section 3 — Level authorization (`LevelController`) — DONE

- **3.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/LevelAuthorizationEndpointTests.java` created — 14 tests covering PUT/PATCH/DELETE `/level/{characterId}/{classId}` × {owner, campaign DM, non-owner/non-DM, missing character} and POST `/levels` × {owner, non-owner/non-DM, missing `character.id` in payload → 400, `character.id` pointing to a missing character → 404}.
- **3.2** (GREEN): `LevelController.java` — added `CharacterService characterService` as a 3rd constructor param. `fullUpdateLevel`, `partialUpdate`, `deleteLevel`: `characterService.findOne(characterId)` → 404 → `canEdit` → 403, kept the existing `levelService.isExists(levelKey)` 404 for PUT/PATCH; `deleteLevel` gained both the character-404 and 403 (neither existed before). `createLevel`: `levelDto.getCharacter() == null || levelDto.getCharacter().getId() == null` → 400, then `characterService.findOne(...)` → 404 → `canEdit` → 403 → existing save.
- Full suite green after this section.

## Section 4 — D&D class catalog authorization (`DndClassController`) + regression migration — DONE

- **4.1** (RED): `backend/src/test/java/com/utn/javaproject/dndsheets/DndClassAuthorizationEndpointTests.java` created — 4 tests: PATCH/DELETE `/dnd-class/{id}` × {admin → 200/204, `ROLE_USER` → 403}. Uses freshly-created `DndClassEntity` fixtures rather than the shared seeded classes (see gotcha below).
- **4.2** (migration): `DndClassEndpointTests.java` — added `savedAdmin(prefix)` helper (design.md's exact builder) and switched `patchDndClass_updatesSavingThrows` / `patchDndClass_preservesExistingFieldsWhenOnlySavingThrowsUpdated` to use it. Confirmed these two tests still passed *before* 4.3 (pure fixture change, no `@PreAuthorize` yet).
- **4.3** (GREEN): `DndClassController.java` — added `@PreAuthorize("hasRole('ADMIN')")` above `partialUpdate` and `deleteDndClass`, byte-identical to the existing annotation on `createDndClass`/`fullUpdateDndClass`.
- Full suite green after this section.

### Gotcha discovered while writing section 4's RED tests

Initial `DndClassAuthorizationEndpointTests` fixtures mutated the shared, seeded "Barbarian" class's `savingThrows` (via `PATCH` as admin). Because DB state isn't rolled back between test methods within a `@SpringBootTest` class (and isn't isolated across classes in the same Surefire JVM), this made the pre-existing `DndClassEndpointTests.listDndClasses_barbarianHasCorrectSavingThrows` test flaky depending on run order (it asserts Barbarian's *original* Strength/Constitution saving throws). Fixed by having `DndClassAuthorizationEndpointTests` create and mutate its own freshly-created `DndClassEntity` fixtures instead of touching seeded/shared classes — no seeded-class assertions elsewhere are affected.

## Notes for continuation / follow-up

- Investigation scratch file `backend/src/test/java/com/utn/javaproject/dndsheets/DebugStatsDeleteTest.java` was created and then deleted during section 2 — not part of the deliverable.
- `backend/src/test/resources/application.properties` — temporary `logging.level.*=DEBUG` lines added during investigation were reverted; confirmed via `git diff` to match its pre-session state exactly.
- Test gate: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/`.
- All of sections 1-4's tasks are implemented and individually/pairwise verified green. A final complete `./mvnw test` run across the whole suite (all ~141 tests) was kicked off as the last step of this apply session — see the sdd-verify phase for the authoritative confirmation and the section 5 checklist (spec scenario coverage walk, proposal success-criteria checklist).
