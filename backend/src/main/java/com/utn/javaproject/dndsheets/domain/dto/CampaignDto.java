package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.dto.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CampaignDto {
    private Long id;
    private String name;
    private String description;
    private Boolean privacy;
    private Date CreationDate;
    private List<UserDto> players;
    private List<CharacterDto> characters;
}
