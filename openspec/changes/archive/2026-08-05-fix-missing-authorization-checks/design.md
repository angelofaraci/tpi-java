# Design: Fix Missing Authorization Checks (IDOR)

Backend-only Spring Boot security hotfix. `openspec/config.yaml`'s `rules.design` is
frontend-oriented (App.tsx state, component props) and does not apply; this document
instead fixes controller methods, injected dependencies, and the per-endpoint check
sequence. No frontend, DTO, entity, or schema change.

## Technical Approach

Replicate the reference shape from `CharacterController.deleteCharacter`
(`backend/.../controllers/CharacterController.java` L138-154) in every broken method:

```java
Optional<XEntity> found = xService.findOne(id);
if (found.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);
if (principal == null || !ownershipPrimitive(found.get(), principal.getUsername()))
    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
// ...existing mutation, unchanged
```

Order is fixed: **404 before 403** (matches the reference; avoids leaking existence only
for owners). `@AuthenticationPrincipal UserDetails principal` is appended as the **last**
parameter of each signature. Existing `isExists(...)` guards are replaced by `findOne(...)`
where the entity is now needed; guards that already load the entity are kept.

## Per-Controller Changes

### CampaignController (no new dependency)
`campaignService.isDm(CampaignEntity, String)` (`services/CampaignService.java` L59-64) is
the primitive — campaigns have no `canEdit`; only the DM mutates.

| Method | Diff |
|---|---|
| `fullUpdateCampaign` PUT L100-113 | add `principal` param; replace `!campaignService.isExists(id)` with `Optional<CampaignEntity> found = campaignService.findOne(id); if (found.isEmpty()) 404;` then `if (principal == null \|\| !campaignService.isDm(found.get(), principal.getUsername())) 403;` before `campaignDto.setId(id)` |
| `partialUpdate` PATCH L115-127 | identical replacement, before `campaignMapper.mapFrom(...)` |
| `deleteCampaign` DELETE L129-137 | add `principal`; add `findOne` 404 + `isDm` 403 **before** the existing `hasCharacters(id)` 409 branch (409 must not be observable by a non-DM) |

### CharacterStatsController (NEW dependency)
Constructor gains a 5th parameter; field `private final CharacterService characterService;`:

```java
public CharacterStatsController(Mapper<CharacterStatsEntity, CharacterStatsDto> characterStatsMapper,
                                CharacterStatsService characterStatsService,
                                CharacterCreateRequestValidator characterCreateRequestValidator,
                                LevelService levelService,
                                CharacterService characterService) { ... }
```

Shared sequence for `fullUpdateCharacterStats` (PUT L83), `partialUpdate` (PATCH L98),
`deleteCharacterStats` (DELETE L120), `updateCharacterHp` (PUT `/{id}/{classId}` L126):
`characterStatsService.findOne(id)` → 404 if empty → `.getCharacter()` (entity field
`CharacterStatsEntity.character`, `@OneToOne @JoinColumn(name="character_id", nullable=false)`)
→ `characterService.canEdit(character, principal.getUsername())` → 403 if false.

- PUT/PATCH: `isExists` is replaced by the `findOne` 404 branch (no double query).
- `deleteCharacterStats` currently has **no** existence check — both the 404 and the 403
  branch are new.
- `updateCharacterHp` already resolves the entity; only the 403 branch is inserted, after
  the existing 404 and before the `levelService.findOne(...)` lookup.

### LevelController (NEW dependency)
Current constructor is `(Mapper<LevelEntity, LevelDto>, LevelService)` — add
`CharacterService characterService`. For `fullUpdateLevel` (PUT L55), `partialUpdate`
(PATCH L74), `deleteLevel` (DELETE L90): `characterService.findOne(characterId)` → 404 if
empty → `canEdit` → 403. The existing `levelService.isExists(levelKey)` 404 stays for
PUT/PATCH (a valid character with no such level is still 404). `deleteLevel` gains both a
new 404 (character absent) and the 403.

### DndClassController (method security only)
Add `@PreAuthorize("hasRole('ADMIN')")` above `partialUpdate` (L67) and `deleteDndClass`
(L81), byte-identical to the annotation on `createDndClass` (L27) and
`fullUpdateDndClass` (L51). No dependency, no principal parameter, no body change.

## Decisions

### Decision: defer `createCharacterStats` (POST /character-stats)
**Choice**: (a) defer to a follow-up change; do not touch it here.
**Rationale**: `domain/dto/CharacterStatsDto.java` has fields `id, xp, proficiency,
abilityScores, velocities, proficiencies, hp` — **no character reference in any form**, so
there is nothing to authorize against without a DTO/mapper contract change. The endpoint is
also already non-functional for its stated purpose: `CharacterStatsEntity.character` is
`nullable = false`, so a standalone POST cannot persist a valid row; real stats are created
through `POST /characters` (`CharacterService` L69 `character.getCharacterStats().setCharacter(character)`).
A DTO change is a larger contract/regression surface than a hotfix should carry.
**Residual risk**: unchanged from today (the endpoint cannot create rows attached to another
user's character). Follow-up should either add `characterId` to the DTO or remove the endpoint.

### Decision: fix `createLevel` (POST /levels) now — id IS reachable
**Choice**: (b). `LevelDto` carries `CharacterDto character` and the frontend already sends
`{ character: { id }, dndClass: { id }, level }` (`frontend/src/interfaces/character.ts`
L118-126). Sequence: `if (levelDto.getCharacter() == null || levelDto.getCharacter().getId() == null)
return 400;` → `characterService.findOne(levelDto.getCharacter().getId())` → 404 if empty →
`canEdit` → 403 → existing save.
**Alternative rejected**: reading `levelDto.getId().getCharacterId()` (`LevelKeyDto` has
`characterId`/`classId`) — the current client never populates `id` on create, so it would
403 every legitimate request.

## File Changes

| File | Action |
|---|---|
| `controllers/CampaignController.java` | Modify — 3 methods |
| `controllers/CharacterStatsController.java` | Modify — constructor + 4 methods |
| `controllers/LevelController.java` | Modify — constructor + 4 methods (incl. `createLevel`) |
| `controllers/DndClassController.java` | Modify — 2 annotations |
| `test/.../CampaignAuthorizationEndpointTests.java` | Create |
| `test/.../CharacterStatsAuthorizationEndpointTests.java` | Create |
| `test/.../LevelAuthorizationEndpointTests.java` | Create |
| `test/.../DndClassAuthorizationEndpointTests.java` | Create |
| `test/.../DndClassEndpointTests.java` | Modify — migrate 2 PATCH tests to admin |

## Testing Strategy

TDD (`strict_tdd: true`): RED test per endpoint first. Gate:
`JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test` from `backend/`.

Pattern copied verbatim from `CharacterDeleteEndpointTests.java`: `@SpringBootTest`
`@AutoConfigureMockMvc`, autowired `MockMvc` / `UserRepository` / `{Entity}Repository` /
`JwtService`, private `savedUser(prefix)` builder with `Role.ROLE_USER`, private
`bearer(user)` = `"Bearer " + jwtService.getToken(user)`. Each new class asserts three
cases per endpoint: owner/DM → existing 2xx **and** persisted effect; other authenticated
user → `403` **and** row unchanged; missing id → `404`.

`DndClassAuthorizationEndpointTests` needs no repository ownership fixture: a `ROLE_USER`
bearer must get `403` on `PATCH`/`DELETE /dnd-class/{id}`, an `ROLE_ADMIN` bearer `200`/`204`.

**Required migration** — `DndClassEndpointTests.java` has **two** PATCH tests that currently
pass as `ROLE_USER` and will turn red: `patchDndClass_updatesSavingThrows` (L78-96) and its
sibling `patchDndClass_preservesExistingFieldsWhenOnlySavingThrowsUpdated` (L98-116). Add a
helper alongside the existing one and switch both call sites' `bearerTokenFor(user)` to an
admin token:

```java
private UserEntity savedAdmin(String prefix) {
    return userRepository.save(UserEntity.builder()
            .username(prefix + "-" + System.nanoTime())
            .email(prefix + "@admin.com")
            .password(passwordEncoder.encode("adminpass"))
            .role(Role.ROLE_ADMIN)
            .build());
}
```

The two GET tests (L51-74) and `classInitializer_patchesExistingClassWithEmptySavingThrows`
(L120) are unaffected.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. This change is HTTP-layer authorization only.

## Migration / Rollout

No migration. Purely additive guards; rollback is `git revert`.

## Open Questions

None. The proposal's blocking question is resolved above (`createLevel` fixed,
`createCharacterStats` explicitly deferred with rationale).
