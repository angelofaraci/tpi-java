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
    @JoinColumn(name = "character_id", nullable = false)
    private CharacterEntity character;
    private Long xp;
    private Short proficiency;
    private HashMap<String,Short> abilityScores;
    private List<Long> velocities;
    // @Lob: default Hibernate-serialized column length (255 bytes) is too small once a
    // character has more than one or two proficiency entries -- Java serialization
    // overhead alone exceeds 255 bytes for a HashMap with class-derived saving-throw
    // defaults populated (see DndClassEntity.levelCharacteristics for the same pattern).
    // Discovered via CreateCharacterIT: a real character-creation round trip (any class
    // selection auto-populates >=1 saving-throw proficiency) failed with H2's
    // "Value too long for column PROFICIENCIES" against the default-length column.
    @Lob
    private HashMap<String, Short> proficiencies;
    private Integer hp;
}
