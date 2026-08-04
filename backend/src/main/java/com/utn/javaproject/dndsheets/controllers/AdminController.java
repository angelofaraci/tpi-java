package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.dto.UserDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import com.utn.javaproject.dndsheets.services.CampaignService;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final CharacterService characterService;
    private final CampaignService campaignService;
    private final Mapper<UserEntity, UserDto> userMapper;
    private final Mapper<CharacterEntity, CharacterDto> characterMapper;
    private final Mapper<CampaignEntity, CampaignDto> campaignMapper;
    private final PasswordEncoder passwordEncoder;

    // ── Dashboard ──────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> getAdminDashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Welcome to the admin dashboard",
                "status", "success",
                "role", "ADMIN"
        ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(Map.of(
                "totalUsers", 100,
                "totalCampaigns", 50,
                "totalCharacters", 250,
                "message", "Admin statistics retrieved successfully"
        ));
    }

    // ── Users ──────────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userService.findAll()
                .stream()
                .map(userMapper::mapTo)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/users/{id}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @RequestBody AdminUpdateUserRequest request) {

        if (!userService.itExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        UserEntity patch = UserEntity.builder()
                .username(request.username())
                .email(request.email())
                .password(request.password() != null ? passwordEncoder.encode(request.password()) : null)
                .build();

        UserEntity updated = userService.partialUpdate(id, patch);
        return ResponseEntity.ok(userMapper.mapTo(updated));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userService.itExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        userService.deleteOne(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ── Characters ─────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/characters")
    public ResponseEntity<List<CharacterDto>> getAllCharacters() {
        List<CharacterDto> characters = characterService.findAll()
                .stream()
                .map(characterMapper::mapTo)
                .toList();
        return ResponseEntity.ok(characters);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/characters/{id}")
    public ResponseEntity<CharacterDto> updateCharacter(
            @PathVariable Long id,
            @RequestBody CharacterDto characterDto) {

        if (!characterService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        try {
            CharacterEntity patch = characterMapper.mapFrom(characterDto);
            CharacterEntity updated = characterService.partialUpdate(id, patch);
            return ResponseEntity.ok(characterMapper.mapTo(updated));
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/characters/{id}")
    public ResponseEntity<Void> deleteCharacter(@PathVariable Long id) {
        if (!characterService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        characterService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ── Campaigns ──────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/campaigns")
    public ResponseEntity<List<CampaignDto>> getAllCampaigns() {
        // findAll() del CampaignService solo devuelve públicas; el admin necesita todas
        List<CampaignDto> campaigns = campaignService.findAllForAdmin()
                .stream()
                .map(campaignMapper::mapTo)
                .toList();
        return ResponseEntity.ok(campaigns);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/campaigns/{id}")
    public ResponseEntity<CampaignDto> updateCampaign(
            @PathVariable Long id,
            @RequestBody CampaignDto campaignDto) {

        if (!campaignService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        CampaignEntity patch = campaignMapper.mapFrom(campaignDto);
        CampaignEntity updated = campaignService.partialUpdate(id, patch);
        return ResponseEntity.ok(campaignMapper.mapTo(updated));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/campaigns/{id}")
    public ResponseEntity<?> deleteCampaign(@PathVariable Long id) {
        if (!campaignService.isExists(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        if (campaignService.hasCharacters(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Cannot delete a campaign that still has characters. Delete or reassign its characters first.");
        }
        campaignService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ── Inner record (request body for user update) ────────────────────────────

    public record AdminUpdateUserRequest(String username, String email, String password) {}
}
