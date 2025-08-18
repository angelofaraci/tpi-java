package com.utn.javaproject.dndsheets.domain.entities;

import com.utn.javaproject.dndsheets.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "Users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_id_seq")
    @SequenceGenerator(name = "user_id_seq", sequenceName = "user_id_seq", allocationSize = 1)
    private Long id;
    private String username;
    private String email;
    private String password;
    private Role role;
    @OneToMany(mappedBy = "dmId", cascade = CascadeType.ALL, orphanRemoval = false)
    private List<CampaignEntity> isDm;
    @OneToMany(mappedBy = "userEntityId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CharacterEntity> characterEntities;
}
