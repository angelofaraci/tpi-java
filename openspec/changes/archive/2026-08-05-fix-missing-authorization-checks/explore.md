# Explore: Fix missing authorization checks (IDOR / broken access control)

## Current state

`CharacterController` (PUT/PATCH/DELETE, `backend/src/main/java/com/utn/javaproject/dndsheets/controllers/CharacterController.java` L87-154) and `PortraitController.uploadPortrait` (L41-76) are the working reference pattern: inject `@AuthenticationPrincipal UserDetails principal`, resolve entity via `characterService.findOne(id)` (404 if empty), then `characterService.canEdit(entity, principal.getUsername())` (403 if false), then mutate. `CharacterService.canEdit` (`services/CharacterService.java` L166-177) grants access to the character owner or the campaign DM.

## Affected areas

1. **`CampaignController.deleteCampaign`** (`controllers/CampaignController.java` L129-137) — no auth check whatsoever, only `campaignService.hasCharacters(id)`. `CampaignService.isDm(campaign, username)` (`services/CampaignService.java` L59-64) is the correct existing check — campaigns have no `canEdit`; only the DM should mutate. Already used by `getCampaign` (L82-98) for the same "is owner" semantics — no new service method needed.
   - **Same-root-cause siblings found**: `fullUpdateCampaign` (PUT, L100-113) and `partialUpdate` (PATCH, L115-127) have the identical defect (only `isExists`, no ownership check). In scope for consistency.

2. **`CharacterStatsController`** (`controllers/CharacterStatsController.java`) — `createCharacterStats` (L37-66), `fullUpdateCharacterStats` (PUT L83-96), `partialUpdate` (PATCH L98-118), `deleteCharacterStats` (DELETE L120-124, lacks even an existence check), `updateCharacterHp` (PUT `/{id}/{classId}` L126-152) all lack ownership checks. `CharacterStatsEntity.character` (`domain/entities/CharacterStatsEntity.java` L23-25, `@OneToOne @JoinColumn(name="character_id")`) is the parent link back to `CharacterEntity`. `updateCharacterHp` already loads `.getCharacter()` — easiest fix. PUT/PATCH/DELETE by id need `characterStatsService.findOne(id)` → `.getCharacter()` → `characterService.canEdit(...)`, which requires injecting `CharacterService` into this controller (not currently a dependency). `createCharacterStats`'s DTO (`domain/dto/CharacterStatsDto.java`) has **no character-id field** — needs a design decision.

3. **`LevelController`** (`controllers/LevelController.java`) — `createLevel` (L27-33, no auth), `fullUpdateLevel`/`partialUpdate` (PUT/PATCH `/level/{characterId}/{classId}`, L55-88), and `deleteLevel` (L90-98, lacks even an existence check) all lack ownership checks. PUT/PATCH/DELETE already receive `characterId` as a `@PathVariable` — straightforward fix via `characterService.findOne(characterId)` → `canEdit`. `createLevel`'s `LevelDto` carries the character id nested (`LevelKeyDto id` or `CharacterDto character`) — exact shape needs confirming at design time.

4. **`DndClassController.partialUpdate`** (PATCH, `controllers/DndClassController.java` L67-79) is missing `@PreAuthorize("hasRole('ADMIN')")`, present on sibling `createDndClass` (L27) and `fullUpdateDndClass` (L51). Confirmed by `DndClassEndpointTests.patchDndClass_updatesSavingThrows` (`backend/src/test/java/com/utn/javaproject/dndsheets/DndClassEndpointTests.java` L79-96), which currently PATCHes successfully as a plain `ROLE_USER` — **adding the annotation will break this test** (and possibly its sibling) unless updated to an admin principal.
   - **Same-root-cause sibling found**: `deleteDndClass` (L81-85) also lacks `@PreAuthorize("hasRole('ADMIN')")`. In scope for consistency.

## Test coverage

No authorization/IDOR tests exist today for any of the 4 reported areas (or the 2 siblings found). Reference test pattern: `CharacterDeleteEndpointTests.java` and `CharacterPortraitEndpointTests.java` — `@SpringBootTest @AutoConfigureMockMvc`, autowired `MockMvc`/`UserRepository`/`{Entity}Repository`/`JwtService`, `savedUser(prefix)` builder (`Role.ROLE_USER`), `bearer(user)` = `"Bearer " + jwtService.getToken(user)`.

## Test config

`backend/src/test/resources/application.properties` (no separate `application-test.properties`) configures H2 in-memory (`ddl-auto=create-drop`, seeders via CommandLineRunner). `openspec/config.yaml`'s `testing.runner.command` is frontend-only (`vitest`) — no backend command recorded there.

**Confirmed backend test command**: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/` (system default `java` on PATH is 17, project requires 21). This matches the `test` job in `.github/workflows/deploy-backend.yml` (`./mvnw -B test`), which gates the deploy job — this is "the CI action" that must stay green.

## Approaches

1. **Direct pattern replication (recommended)** — replicate the exact `CharacterController`/`PortraitController` shape per broken endpoint.
   - Pros: consistent with codebase convention, low review risk, reuses existing `canEdit`/`isDm`.
   - Cons: some repetition; needs new `CharacterService` dependency in `CharacterStatsController`; two POST endpoints (`createCharacterStats`, `createLevel`) need DTO/mapper investigation for how the parent character id is threaded through.
   - Effort: Medium

2. **Centralized authorization aspect/annotation** (`@RequireOwnership` + AOP/interceptor).
   - Pros: DRY, prevents future omissions.
   - Cons: no precedent in codebase, large architectural change, high regression risk for a security hotfix, delays remediation.
   - Effort: High

## Recommendation

Approach 1. Keep scope to the reported endpoints plus the two same-root-cause siblings found during exploration (`CampaignController` PUT/PATCH, `DndClassController.deleteDndClass`), each with a regression test mirroring `CharacterDeleteEndpointTests`.

## Risks

- `DndClassController.partialUpdate` fix breaks existing `DndClassEndpointTests` PATCH test(s) unless updated to use an admin principal.
- `createCharacterStats` / `createLevel` lack a directly reachable character id in their current request DTOs — needs a design decision (mapper/DTO change) before implementation.
- No backend test command was recorded in `openspec/config.yaml` prior to this change — `sdd-tasks`/`sdd-apply`/`sdd-verify` must be told explicitly: `JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/`.

## Confirmed scope going into proposal

- In scope: `CampaignController` (DELETE + same-root-cause PUT/PATCH), `CharacterStatsController` (all 5 mutating endpoints), `LevelController` (all 4 mutating endpoints), `DndClassController` (PATCH + same-root-cause DELETE).
- Out of scope: introducing a generic authorization aspect/annotation framework; touching `CharacterController`/`PortraitController` (already fixed) or `RaceController`/`AdminController` (already protected).
