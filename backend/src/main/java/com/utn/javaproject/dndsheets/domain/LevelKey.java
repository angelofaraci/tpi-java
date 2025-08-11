package com.utn.javaproject.dndsheets.domain;


import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;

@Embeddable
class LevelKey implements Serializable {

    @Column(name = "character_id")
    private Long characterId;

    @Column(name = "class_id")
    private Long courseId;

}