package com.utn.javaproject.dndsheets.services;

import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
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

import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CharacterServiceDeletePortraitTest {

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
    void delete_whenCharacterHasPortraitUrl_callsFileStorageDeleteWithThatUrl() {
        Long characterId = 42L;
        String portraitUrl = "/uploads/portraits/test-uuid.jpg";

        CharacterEntity character = CharacterEntity.builder()
                .name("Portrait Character")
                .portraitUrl(portraitUrl)
                .build();

        when(characterRepository.findById(characterId)).thenReturn(Optional.of(character));

        characterService.delete(characterId);

        verify(fileStorageService).delete(portraitUrl);
    }
}
