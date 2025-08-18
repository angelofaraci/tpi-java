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
@Table(name = "Characters")
public class CharacterEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "character_id_seq")
    @SequenceGenerator(name = "character_id_seq", sequenceName = "character_id_seq", allocationSize = 1)
    private Long id;
    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity userEntityId;
    @ManyToOne
    @JoinColumn(name = "campaign_id")
    private CampaignEntity campaignEntityId;
    private String name;
    private List<String> characteristics;
    private String alignment;
    private String Background;
    @OneToOne(mappedBy = "characterEntityId")
    private CharacterStatsEntity charactersStats;
    @ManyToOne
    @JoinColumn(name = "character_id")
    private RaceEntity raceEntityId;

}