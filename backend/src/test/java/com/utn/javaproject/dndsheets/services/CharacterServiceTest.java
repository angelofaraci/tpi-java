package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.domain.entities.UserEntity;
import com.utn.javaproject.dndsheets.repositories.CampaignRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterRepository;
import com.utn.javaproject.dndsheets.repositories.CharacterStatsRepository;
import com.utn.javaproject.dndsheets.repositories.RaceRepository;
import com.utn.javaproject.dndsheets.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CharacterServiceTest {

    @Mock
    private CharacterRepository characterRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CampaignRepository campaignRepository;

    @Mock
    private RaceRepository raceRepository;

    @Mock
    private CharacterStatsRepository characterStatsRepository;

    @Mock
    private LevelService levelService;

    @Mock
    private CharacterCreateRequestValidator characterCreateRequestValidator;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private CharacterService characterService;

    @Test
    void canAccess_returnsTrue_whenViewerOwnsAnotherCharacterInSameCampaignJoinedByCode() {
        // GIVEN a private campaign joined by two players who each own a character but
        // were never added to the explicit campaign_players list (join-by-code flow)
        UserEntity dm = UserEntity.builder().username("dm").email("dm@example.com").password("secret").build();
        setId(dm, 1L);

        UserEntity viewer = UserEntity.builder().username("viewer").email("viewer@example.com").password("secret").build();
        setId(viewer, 2L);

        UserEntity targetOwner = UserEntity.builder().username("target-owner").email("target@example.com").password("secret").build();
        setId(targetOwner, 3L);

        CharacterEntity viewerCharacter = CharacterEntity.builder().name("Viewer's Hero").user(viewer).build();
        CharacterEntity targetCharacter = CharacterEntity.builder().name("Target's Hero").user(targetOwner).build();

        CampaignEntity privateCampaign = CampaignEntity.builder()
                .name("Joined By Code Table")
                .privacy(true)
                .dm(dm)
                .players(List.of()) // neither player was added to the explicit list
                .characters(List.of(viewerCharacter, targetCharacter))
                .build();
        targetCharacter.setCampaign(privateCampaign);

        when(userRepository.findByUsername("viewer")).thenReturn(Optional.of(viewer));

        // WHEN the viewer (a fellow player via character ownership, not the players list)
        // tries to view the target's character sheet
        boolean result = characterService.canAccess(targetCharacter, "viewer");

        // THEN access is granted
        assertThat(result).isTrue();
    }

    @Test
    void canAccess_returnsFalse_whenOutsiderHasNoCharacterInPrivateCampaign() {
        UserEntity dm = UserEntity.builder().username("dm").email("dm@example.com").password("secret").build();
        setId(dm, 1L);

        UserEntity targetOwner = UserEntity.builder().username("target-owner").email("target@example.com").password("secret").build();
        setId(targetOwner, 2L);

        UserEntity outsider = UserEntity.builder().username("outsider").email("outsider@example.com").password("secret").build();
        setId(outsider, 3L);

        CharacterEntity targetCharacter = CharacterEntity.builder().name("Target's Hero").user(targetOwner).build();

        CampaignEntity privateCampaign = CampaignEntity.builder()
                .name("Private Table")
                .privacy(true)
                .dm(dm)
                .players(List.of())
                .characters(List.of(targetCharacter))
                .build();
        targetCharacter.setCampaign(privateCampaign);

        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));

        boolean result = characterService.canAccess(targetCharacter, "outsider");

        assertThat(result).isFalse();
    }

    // Helper to set the ID field via reflection (entities use @GeneratedValue)
    private static void setId(UserEntity entity, Long id) {
        try {
            var field = UserEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set id via reflection", e);
        }
    }
}
