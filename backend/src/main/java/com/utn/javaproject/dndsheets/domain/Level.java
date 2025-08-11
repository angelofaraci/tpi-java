package com.utn.javaproject.dndsheets.domain;

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
public class Level {
    @EmbeddedId
    private LevelKey id;

    @ManyToOne
    @MapsId("character_id")
    @JoinColumn(name = "character_id")
    private Character character;

    @ManyToOne
    @MapsId("class_id")
    @JoinColumn(name = "class_id")
    private DndClass dndClass;

    private Short Level;
}

