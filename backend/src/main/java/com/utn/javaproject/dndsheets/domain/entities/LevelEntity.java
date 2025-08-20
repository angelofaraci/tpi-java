package com.utn.javaproject.dndsheets.domain.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "Level")
public class LevelEntity {
    @EmbeddedId
    private LevelKey id;

    @ManyToOne
    @MapsId("characterId")
    @JoinColumn(name = "character_id", insertable = false, updatable = false)
    private CharacterEntity characterEntity;

    @ManyToOne
    @MapsId("classId")
    @JoinColumn(name = "class_id", insertable = false, updatable = false)
    private DndClassEntity dndClassEntity;

    private Short level;
}

