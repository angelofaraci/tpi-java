package com.utn.javaproject.dndsheets.controllers;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.services.CharacterService;
import com.utn.javaproject.dndsheets.services.FileStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
public class PortraitController {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    private final CharacterService characterService;
    private final FileStorageService fileStorageService;

    public PortraitController(CharacterService characterService, FileStorageService fileStorageService) {
        this.characterService = characterService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * POST /characters/{id}/portrait
     * Multipart field: file
     * Returns: { portraitUrl: "/uploads/portraits/{uuid}.ext" }
     *
     * Validates MIME type, checks character ownership, then replaces the portrait.
     * Deletes the previous portrait (if any) before storing the new file.
     */
    @PostMapping("/characters/{id}/portrait")
    public ResponseEntity<Map<String, String>> uploadPortrait(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails principal) {

        // Issue 1: MIME type validation — reject non-image content types
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
        }

        // Warning fix: return 404 instead of throwing RuntimeException
        Optional<CharacterEntity> found = characterService.findOne(id);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        CharacterEntity character = found.get();

        // Issue 2: character-level authorization — only the owner or campaign DM may upload
        String username = principal != null ? principal.getUsername() : null;
        if (username == null || !characterService.canEdit(character, username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Task 2.4: delete previous portrait to avoid orphaned files
        fileStorageService.delete(character.getPortraitUrl());

        String portraitUrl = fileStorageService.store(file);

        CharacterEntity patch = new CharacterEntity();
        patch.setPortraitUrl(portraitUrl);
        characterService.partialUpdate(id, patch);

        return ResponseEntity.ok(Map.of("portraitUrl", portraitUrl));
    }
}
