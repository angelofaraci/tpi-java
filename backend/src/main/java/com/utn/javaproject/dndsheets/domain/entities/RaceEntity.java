package com.utn.javaproject.dndsheets.domain.entities;

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
@Table(name = "Races")
public class RaceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "race_id_seq")
    @SequenceGenerator(name = "race_id_seq", sequenceName = "race_id_seq", allocationSize = 1)
    private Long id;
    private String name;
    private String description;
    private List<String> racialFeats;
}
