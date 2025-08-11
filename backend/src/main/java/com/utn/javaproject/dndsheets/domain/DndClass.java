package com.utn.javaproject.dndsheets.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "Class")
public class DndClass {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "class_id_seq")
    @SequenceGenerator(name = "class_id_seq", sequenceName = "class_id_seq", allocationSize = 1)
    private Long id;

    private String description;
    private HashMap<Short, String> levelCharacteristics;

}
