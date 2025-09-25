package com.utn.javaproject.dndsheets.domain.entities;


import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@Embeddable
public class LevelKey implements Serializable {

    @Column(name = "character_id")
    private Long characterId;

    @Column(name = "class_id")
    private Long classId;

    public LevelKey(Long characterId, Long classId) {
        this.characterId = characterId;
        this.classId = classId;
    }
}