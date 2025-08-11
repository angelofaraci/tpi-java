package com.utn.javaproject.dndsheets.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.stream.events.Characters;
import java.util.Date;
import java.util.HashMap;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "CharacterStats")
public class CharacterStats {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "character_stats_id_seq")
    @SequenceGenerator(name = "character_stats_id_seq", sequenceName = "character_stats_id_seq", allocationSize = 1)
    private Long id;
    @OneToOne
    @JoinColumn(name = "character_id")
    private Character characterId;

    private Long xp;
    private Short proficiency;
    private HashMap<String,Short> abilityScores;
    private HashMap<String, Short> abilityModifier;
    private List<Long> velocities;
    private HashMap<String, Short> proficiencies;
    private Long hp;
}
