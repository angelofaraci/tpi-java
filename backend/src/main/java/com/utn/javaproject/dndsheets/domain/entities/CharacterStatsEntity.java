package com.utn.javaproject.dndsheets.domain.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "CharacterStats")
public class CharacterStatsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "character_stats_id_seq")
    @SequenceGenerator(name = "character_stats_id_seq", sequenceName = "character_stats_id_seq", allocationSize = 1)
    private Long id;
    @OneToOne
    @JoinColumn(name = "character_id")
    private CharacterEntity character;
    private Long xp;
    private Short proficiency;
    private HashMap<String,Short> abilityScores;
    private List<Long> velocities;
    private HashMap<String, Short> proficiencies;
    private Integer hp;
}
