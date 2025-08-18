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
    @MapsId
    @JoinColumn(name = "character_id")
    private CharacterEntity characterEntity;

    @ManyToOne
    @MapsId
    @JoinColumn(name = "class_id")
    private DndClassEntity dndClassEntity;

    private Short Level;
}

