```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:4c426a090ab1047d43d555ecab58fa5e79fd06b713c7a847368b0b2b168709ae
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 20/20
test_command: "JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw test"
test_exit_code: 0
test_output_hash: sha256:4c426a090ab1047d43d555ecab58fa5e79fd06b713c7a847368b0b2b168709ae
build_command: "JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk ./mvnw -DskipTests compile"
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: fix-missing-authorization-checks
**Version**: N/A (openspec artifact store)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 15 (1.1–4.3) + 3 (5.1–5.3) = 18 |
| Tasks complete (sections 1–4) | 15/15 |
| Section 5 (this run) | 5.1, 5.2, 5.3 executed and confirmed below |

### Build & Tests Execution

**Build**: PASSED — `./mvnw -DskipTests compile` exit 0.

**Tests**: PASSED — ran fresh twice (not trusting cached apply-session results), identical result both times:

```
[INFO] Tests run: 137, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

137 tests, 0 failures, 0 errors, 0 skipped, both runs. Includes all 4 new authorization test classes plus the migrated `DndClassEndpointTests`.

**Coverage**: Not available — no coverage tool detected in the Maven build (no JaCoCo plugin present). Skipped per skill instructions, not a failure.

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Campaign mutation is DM-only | DM deletes their campaign | `CampaignAuthorizationEndpointTests.deleteCampaign_dm_returns2xxAndRemovesCampaign` | ✅ COMPLIANT |
| Campaign mutation is DM-only | Non-DM attempts update (PUT/PATCH) | `putCampaign_nonDm_returns403AndLeavesUnchanged`, `patchCampaign_nonDm_returns403AndLeavesUnchanged` | ✅ COMPLIANT |
| Campaign mutation is DM-only | Mutation on missing campaign (DELETE/PUT/PATCH) | `putCampaign_missingCampaign_returns404`, `patchCampaign_missingCampaign_returns404`, `deleteCampaign_missingCampaign_returns404` | ✅ COMPLIANT |
| Character-stats owner-or-DM | Owner updates PUT/PATCH | `putCharacterStats_owner_returns200AndPersists`, `patchCharacterStats_owner_returns200AndPersists` | ✅ COMPLIANT |
| Character-stats owner-or-DM | Campaign DM updates HP | `putHp_campaignDm_returns200` | ✅ COMPLIANT |
| Character-stats owner-or-DM | Non-owner/non-DM any mutation | `putCharacterStats_nonOwnerNonDm_...`, `patchCharacterStats_nonOwnerNonDm_...`, `deleteCharacterStats_nonOwnerNonDm_...`, `putHp_nonOwnerNonDm_...` | ✅ COMPLIANT |
| Character-stats owner-or-DM | DELETE on missing resource → 404 | `deleteCharacterStats_missing_returns404` | ✅ COMPLIANT |
| Level owner-or-DM | Owner updates PUT/PATCH | `putLevel_owner_returns200`, `patchLevel_owner_returns200` | ✅ COMPLIANT |
| Level owner-or-DM | Non-owner/non-DM PUT/PATCH/DELETE | `putLevel_nonOwnerNonDm_...`, `patchLevel_nonOwnerNonDm_...`, `deleteLevel_nonOwnerNonDm_...` | ✅ COMPLIANT |
| Level owner-or-DM | DELETE on missing character → 404 | `deleteLevel_missingCharacter_returns404` | ✅ COMPLIANT |
| Level creation authorized character id | Owner creates level | `createLevel_owner_returns201AndPersists` | ✅ COMPLIANT |
| Level creation authorized character id | Non-owner/non-DM create attempt | `createLevel_nonOwnerNonDm_returns403AndCreatesNothing` | ✅ COMPLIANT |
| Level creation authorized character id | Missing character id in payload → 400 | `createLevel_missingCharacterId_returns400` | ✅ COMPLIANT |
| Level creation authorized character id | character.id points to missing character → 404 | `createLevel_missingCharacter_returns404` | ✅ COMPLIANT |
| D&D class catalog admin-only | Admin patches a class | `DndClassAuthorizationEndpointTests.patchDndClass_admin_returns200` | ✅ COMPLIANT |
| D&D class catalog admin-only | Non-admin attempts PATCH/DELETE | `patchDndClass_nonAdmin_returns403`, `deleteDndClass_nonAdmin_returns403` | ✅ COMPLIANT |
| DndClassEndpointTests uses admin principal | Regression asserts admin-only PATCH | `DndClassEndpointTests.patchDndClass_updatesSavingThrows` (migrated to `savedAdmin`, still asserts 200) | ✅ COMPLIANT |

**Compliance summary**: 20/20 GIVEN/WHEN/THEN scenarios in `specs/endpoint-authorization/spec.md` have a matching, passing test method. No scenario found uncovered. All test bodies were read directly (not inferred from method names) and confirmed to assert real status codes plus persisted/unchanged state via repository reloads — no tautologies, no smoke-tests-only, no ghost loops.

### Correctness (Static Evidence — independent source read, not apply-progress's description)

Spot-checked 4 of the modified controllers directly against design.md's specified diff:

| Controller/Method | 404-before-403 order correct? | Notes |
|---|---|---|
| `CampaignController.fullUpdateCampaign` / `partialUpdate` / `deleteCampaign` | ✅ Yes | `findOne` → 404 → `isDm` → 403, in that order in all 3 methods. `deleteCampaign`'s check runs before the `hasCharacters` 409 branch, exactly as design.md requires (409 not observable by non-DM). |
| `CharacterStatsController` (all 4 methods) | ✅ Yes | `findOne(id)` → 404 → `characterService.canEdit(found.get().getCharacter(), ...)` → 403, before mutation. `deleteCharacterStats` has both branches newly added, matching design. |
| `LevelController` (`fullUpdateLevel`, `partialUpdate`, `deleteLevel`, `createLevel`) | ✅ Yes | `characterService.findOne(characterId)` → 404 → `canEdit` → 403, `levelService.isExists` 404 kept for PUT/PATCH. `createLevel` checks payload-missing-id → 400 first, then 404, then 403, exactly matching design.md's specified order. |
| `DndClassController` | ✅ Yes | `@PreAuthorize("hasRole('ADMIN')")` added above `partialUpdate` and `deleteDndClass`, byte-identical to the existing annotation on `createDndClass`/`fullUpdateDndClass`. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Reuse `canEdit`/`isDm` as-is, no new primitives | ✅ Yes | Confirmed in all 4 controllers — no new authorization logic invented. |
| `@AuthenticationPrincipal UserDetails principal` as last param | ✅ Yes | Confirmed in all modified signatures. |
| `createCharacterStats` deferred (out of scope) | ✅ Yes | Untouched — confirmed no changes to that endpoint. |
| `createLevel` fixed via `LevelDto.character.id` | ✅ Yes | Confirmed, matches design exactly including the 400/404/403 order. |
| `DndClassEndpointTests` migration to admin principal | ✅ Yes | `savedAdmin` helper added, both PATCH tests migrated, still pass. |

### Success Criteria Checklist (proposal.md)

- [x] Each in-scope endpoint returns `403` for authenticated non-owner/non-admin — confirmed via test matrix above, all passing.
- [x] Each in-scope endpoint returns `404` for a non-existent resource — confirmed for all 12 in-scope endpoints, including the two that had no prior existence check (`deleteCharacterStats`, `deleteLevel`).
- [x] Owner/DM/admin behavior unchanged — positive-path 2xx tests exist and pass for every endpoint (owner and DM variants where applicable).
- [x] `./mvnw test` green — confirmed twice, fresh, 137/137, 0 failures/errors.

**All four Success Criteria items are satisfied.**

### Debug Artifact / Cleanliness Check

- `DebugStatsDeleteTest.java` — confirmed **not present** in the working tree (`fd`/`ls` on the test directory returns nothing); apply-progress.md's claim that it was deleted is verified true, not just claimed.
- `System.out.println` — none found in any of the 4 modified controllers, `CharacterStatsService.java`, or `CharacterStatsRepository.java`.
- `backend/src/test/resources/application.properties` — no diff against the last commit; the claimed revert of temporary `DEBUG` logging lines is confirmed (empty `git diff`).

### Out-of-scope files present in git status

`CharacterController.java` (modified) and `CharacterDeleteEndpointTests.java` (untracked) both appear in `git status`. Verified these are **pre-existing, unrelated to this SDD change**:
- Filesystem mtimes: `CharacterController.java` (16:17:57) and `CharacterDeleteEndpointTests.java` (16:19:32) both predate `CampaignController.java`'s mtime (16:49:01), which is section 1's first edit in this change — i.e., they were already sitting in the working tree, uncommitted, before this SDD change's apply phase began.
- Neither file is mentioned as a target in tasks.md sections 1–4, nor in design.md's "File Changes" table.
- Design.md explicitly cites `CharacterController.deleteCharacter` (L138–154) as the **existing reference pattern** replicated by this change — consistent with it having been added to the working tree earlier (its own authorization fix, not yet committed) rather than being new work performed under this change's scope.
- Not flagged as part of this change's verification per the proposal's explicit statement that `CharacterController` is "already protected" / out of scope. Noted here only for completeness; these files should be committed and reviewed under their own (apparently separate, already-completed) change before or alongside this one, since they currently sit as uncommitted diffs in the same working tree.

### Strict TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ⚠️ Partial | `apply-progress.md` documents RED/GREEN narratively per task (1.1 RED / 1.2 GREEN, etc.) but does not use the formal "TDD Cycle Evidence" table format (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR columns) the strict-tdd-verify module expects. |
| All tasks have tests | ✅ Yes | Every implementation task (1.2, 2.2, 3.2, 4.3) has a corresponding RED test task (1.1, 2.1, 3.1, 4.1/4.2) with a real test file. |
| RED confirmed (test files exist) | ✅ Yes | All 4 new test classes + migrated `DndClassEndpointTests.java` exist and were read directly. |
| GREEN confirmed (tests pass now) | ✅ Yes | 137/137 pass on two independent fresh full-suite runs. |
| Triangulation adequate | ✅ Yes | Each endpoint has separate owner/DM, non-owner-non-DM, and missing-resource test cases — no single-case coverage for multi-scenario requirements. |
| Safety net for modified files | ✅ Yes | Full suite (all 137 tests, including pre-existing ones) passes after every section per apply-progress.md, and confirmed again fresh here. |

**TDD Compliance**: 5/6 checks fully passed — WARNING for missing formal TDD Cycle Evidence table format (substance present, format non-conformant).

**Assertion quality**: ✅ All assertions verify real behavior (spot-checked test bodies assert exact HTTP status plus repository-reload state checks; no tautologies, no empty-loop assertions, no smoke-test-only patterns found).

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. `apply-progress.md` does not use the formal "TDD Cycle Evidence" table format required by the strict-tdd-verify module, even though RED/GREEN evidence is present narratively per task. Recommend using the table format in future sections for stricter machine-verifiability.
2. `CharacterController.java` and `CharacterDeleteEndpointTests.java` are pre-existing uncommitted changes sitting in the same working tree, out of this change's scope, and not yet committed under any change. They should be committed/reviewed separately so `git status` for this change is clean going forward.

**SUGGESTION**: None.

### Verdict

**PASS WITH WARNINGS** — All 6 spec requirements and 20 scenarios are covered by real, passing, behaviorally-meaningful tests; all 4 controllers independently verified against design.md's exact diff; the full suite is green on two independent fresh runs (137/137, 0 failures/errors); proposal Success Criteria fully satisfied; no debug artifacts remain. The two warnings above (TDD evidence table format, pre-existing out-of-scope uncommitted files) do not block archive — neither affects the correctness or completeness of this change's implementation.
