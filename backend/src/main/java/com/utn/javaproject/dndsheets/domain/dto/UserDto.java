package com.utn.javaproject.dndsheets.domain.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.utn.javaproject.dndsheets.Role;
import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDto {
    private Long id;
    private String username;
    private String email;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private Role role;
    @JsonIgnore
    private List<CampaignDto> isDm;
    @JsonIgnore
    private List<CharacterDto> charactersDto;
}
