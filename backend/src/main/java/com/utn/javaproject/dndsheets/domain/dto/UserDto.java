package com.utn.javaproject.dndsheets.domain.dto;

import com.utn.javaproject.dndsheets.Role;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
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
    private String password;
    private Role role;
    private List<CampaignEntity> isDm;
    private List<CharacterEntity> characterEntity;
}
