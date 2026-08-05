# Tasks: Fix Missing Authorization Checks (IDOR)

Backend-only. Test gate for every task below: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/`.
`strict_tdd: true` — every implementation task is preceded by its failing-test task (RED before GREEN).

Spec reference: `openspec/changes/fix-missing-authorization-checks/specs/endpoint-authorization/spec.md`
Design reference: `openspec/changes/fix-missing-authorization-checks/design.md`

---

## 1. Campaign authorization (`CampaignController`)

Spec: "Campaign mutation is DM-only". Design: `campaignService.isDm(...)`, 404-then-403 order, `deleteCampaign` guard must run before the existing `hasCharacters` 409 branch.

- [x] **1.1** (RED) Create `backend/src/test/java/com/utn/javaproject/dndsheets/CampaignAuthorizationEndpointTests.java` — copy the `CharacterDeleteEndpointTests` pattern (`savedUser`, `bearer`, `@SpringBootTest` + `@AutoConfigureMockMvc`). Add a `savedCampaign(dm, name)` helper. Write 9 failing tests: `PUT`/`PATCH`/`DELETE campaign/{id}` × {DM → 2xx and persisted, non-DM authenticated → 403 and unchanged, missing id → 404}. Run `./mvnw test` and confirm these 9 fail (RED) while the suite otherwise still compiles.
- [x] **1.2** (GREEN) Implement in `CampaignController.java`: add `@AuthenticationPrincipal UserDetails principal` as the last parameter of `fullUpdateCampaign`, `partialUpdate`, `deleteCampaign`. Replace `campaignService.isExists(id)` with `campaignService.findOne(id)` → 404 if empty → `if (principal == null || !campaignService.isDm(found.get(), principal.getUsername())) 403` before the existing mutation logic. In `deleteCampaign`, insert the 404/403 checks **before** the existing `hasCharacters(id)` 409 check. Run `./mvnw test` and confirm all 9 tests from 1.1 pass and no other test regresses.

_Depends on: none. Can run in parallel with sections 2, 3, 4._

---

## 2. Character-stats authorization (`CharacterStatsController`)

Spec: "Character-stats mutation is owner-or-campaign-DM". Design: inject `CharacterService` (5th constructor param), resolve `characterStatsService.findOne(id).getCharacter()` → `characterService.canEdit(...)`.

- [x] **2.1** (RED) Create `backend/src/test/java/com/utn/javaproject/dndsheets/CharacterStatsAuthorizationEndpointTests.java` — helpers for a character owned by a user (reuse/adapt `characterOwnedBy`) plus its linked `CharacterStatsEntity`, and a campaign+DM fixture for the DM-editing scenario. Write failing tests covering `PUT`/`PATCH`/`DELETE /character-stats/{id}` and `PUT /character-stats/{id}/{classId}` (HP) × {owner → 2xx and persisted, campaign DM → 2xx, non-owner/non-DM authenticated → 403 and unchanged, missing id → 404 (including `DELETE`, which has no existence check today)}. Run `./mvnw test` and confirm these fail (RED); constructor injection will not yet compile against the new dependency, so expect a compile-time RED until 2.2 — note this explicitly if the module fails to build rather than fails at runtime.
- [x] **2.2** (GREEN) In `CharacterStatsController.java`: add field `private final CharacterService characterService;` and constructor parameter per design.md's exact signature. In `fullUpdateCharacterStats`, `partialUpdate`, `deleteCharacterStats`, `updateCharacterHp`: resolve `characterStatsService.findOne(id)` → 404 if empty → `characterService.canEdit(found.get().getCharacter(), principal.getUsername())` → 403 if false. `deleteCharacterStats` gains both the 404 and 403 branches (neither exists today). `updateCharacterHp` keeps its existing 404 and inserts the 403 check before the `levelService.findOne(...)` lookup. Run `./mvnw test` and confirm all tests from 2.1 pass.

_Depends on: none (independent controller/service). Can run in parallel with sections 1, 3, 4._

---

## 3. Level authorization (`LevelController`)

Spec: "Level mutation is owner-or-campaign-DM" and "Level creation requires a reachable, authorized character id". Design: inject `CharacterService`, `characterService.findOne(characterId)` → `canEdit`; `createLevel` reads `levelDto.getCharacter().getId()`, 400 if absent.

- [x] **3.1** (RED) Create `backend/src/test/java/com/utn/javaproject/dndsheets/LevelAuthorizationEndpointTests.java` — character+owner and campaign+DM fixtures, plus a saved `LevelEntity` (or the minimum needed for `PUT`/`PATCH`/`DELETE /level/{characterId}/{classId}`). Write failing tests for `PUT`/`PATCH`/`DELETE /level/{characterId}/{classId}` × {owner → 2xx, DM → 2xx, non-owner/non-DM authenticated → 403 and unchanged, missing character → 404 (including `DELETE`)}, plus `POST /levels` × {owner with `character.id` set → 201 and persisted, non-owner/non-DM with `character.id` set → 403 and nothing created, missing `character.id` in payload → 400, `character.id` pointing to a missing character → 404}. Run `./mvnw test` and confirm RED (expect compile-time RED once the constructor signature changes are anticipated by the test doubles/config — if the module does not yet compile, note that explicitly rather than treating it as an unrelated failure).
- [x] **3.2** (GREEN) In `LevelController.java`: add `CharacterService characterService` to the constructor. In `fullUpdateLevel`, `partialUpdate`, `deleteLevel`: `characterService.findOne(characterId)` → 404 if empty → `canEdit` → 403 if false; keep the existing `levelService.isExists(levelKey)` 404 for PUT/PATCH; `deleteLevel` gains both the character-404 and the 403 (neither exists today). In `createLevel`: `if (levelDto.getCharacter() == null || levelDto.getCharacter().getId() == null) return 400;` then `characterService.findOne(...)` → 404 → `canEdit` → 403 → existing save logic. Run `./mvnw test` and confirm all tests from 3.1 pass.

_Depends on: none. Can run in parallel with sections 1, 2, 4. Note: if 2.2 and 3.2 land in the same PR, both controllers gain a `CharacterService` dependency independently — no shared code, no ordering constraint between them._

---

## 4. D&D class catalog authorization (`DndClassController`) + regression migration

Spec: "D&D class catalog mutation is admin-only" and "DndClassEndpointTests uses an admin principal". Design: `@PreAuthorize("hasRole('ADMIN')")` on `partialUpdate` and `deleteDndClass`, identical to the existing annotation on `createDndClass`/`fullUpdateDndClass`.

- [x] **4.1** (RED) Create `backend/src/test/java/com/utn/javaproject/dndsheets/DndClassAuthorizationEndpointTests.java` — no ownership fixture needed; a `ROLE_USER` bearer and a `ROLE_ADMIN` bearer (add a `savedAdmin(prefix)` helper per design.md's exact builder). Write failing tests: `PATCH`/`DELETE /dnd-class/{id}` × {admin → 200/204, `ROLE_USER` → 403}. Run `./mvnw test` and confirm RED.
- [x] **4.2** (RED, migration) In the existing `backend/src/test/java/com/utn/javaproject/dndsheets/DndClassEndpointTests.java`, add the `savedAdmin(prefix)` helper (design.md's exact code) and switch the bearer token in `patchDndClass_updatesSavingThrows` and `patchDndClass_preservesExistingFieldsWhenOnlySavingThrowsUpdated` from a `ROLE_USER` principal to the new admin principal. Confirm these two tests still pass **before** 4.3 (they must not depend on the not-yet-added `@PreAuthorize`) — this is a pure test-fixture change, not itself a RED step, but must land before 4.3 or both tests will start failing once the annotation is added.
- [x] **4.3** (GREEN) In `DndClassController.java`, add `@PreAuthorize("hasRole('ADMIN')")` above `partialUpdate` and `deleteDndClass`, byte-identical to the existing annotation on `createDndClass`/`fullUpdateDndClass`. Run `./mvnw test` and confirm: all tests from 4.1 pass, the two migrated tests from 4.2 still pass, and no other `DndClassEndpointTests` test (the two GET tests, `classInitializer_patchesExistingClassWithEmptySavingThrows`) regresses.

_Depends on: 4.2 must land before 4.3 (ordering within this section only). Section 4 as a whole can run in parallel with sections 1, 2, 3._

---

## 5. Full-suite verification

- [x] **5.1** Run `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/` with all of sections 1–4 applied. Confirm 100% green, including every new authorization test class and the migrated `DndClassEndpointTests`.
- [x] **5.2** Walk the spec's scenario list (`endpoint-authorization/spec.md`) and confirm each GIVEN/WHEN/THEN scenario has a corresponding test method — no scenario silently uncovered.
- [x] **5.3** Confirm the proposal's Success Criteria checklist (403 for non-owner/non-admin, 404 for missing resource, unchanged owner/DM/admin behavior, green `./mvnw test`) is fully satisfied.

_Depends on: sections 1–4 complete._

---

## Review Workload Forecast

**Estimated changed lines** (additions, rough order-of-magnitude by section):

| Section | Controller diff | New/modified test file | Est. lines |
|---|---|---|---|
| 1. Campaign | ~20–25 | `CampaignAuthorizationEndpointTests.java` (9 tests) | ~180–220 |
| 2. CharacterStats | ~35–40 (incl. constructor) | `CharacterStatsAuthorizationEndpointTests.java` (12+ tests) | ~250–300 |
| 3. Level | ~40–45 (incl. constructor) | `LevelAuthorizationEndpointTests.java` (11+ tests incl. POST) | ~250–300 |
| 4. DndClass | ~2 | `DndClassAuthorizationEndpointTests.java` (4 tests) + `DndClassEndpointTests.java` migration (~15) | ~110–150 |
| **Total** | **~100–110** | | **~790–970** |

**Does this fit the 400-line single-PR default budget?** No. The total estimate
(~900–1,100 lines including controller diffs) is roughly 2–3× the 400-line budget already
agreed for this repo's delivery strategy.

**Recommendation**: chain by section — sections 1–4 above are already independent
(different controllers/services, no shared code, no cross-section ordering constraint;
only 4.2 → 4.3 has an internal ordering requirement). Each section's controller diff +
its own new test file stays close to or under the 400-line budget on its own
(~180–300 lines per PR). This matches the design.md "File Changes" table's natural
grouping and the risk table's mitigation (add tests alongside each fix) without forcing
one oversized PR.

**Decision needed before apply**: confirm with the user whether to (a) chain as 4
section-scoped PRs (1 → Campaign, 2 → CharacterStats, 3 → Level, 4 → DndClass +
migration), each independently reviewable and mergeable, or (b) request an explicit
budget exception for a single ~900–1,100-line PR given this is one cohesive security
hotfix. Chaining is recommended: no section depends on another's merge to be
individually correct and deployable, so splitting does not leave any *landed* endpoint
half-fixed — only the *not-yet-landed* sections remain exploitable, same as today.
