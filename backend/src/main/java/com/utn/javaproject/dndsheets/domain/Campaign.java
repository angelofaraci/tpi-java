package com.utn.javaproject.dndsheets.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.stream.events.Characters;
import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "Campaigns")
public class Campaign {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "campaign_id_seq")
    private Long id;
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User dmId;
    private String name;
    private String description;
    private Boolean privacy;
    private Date CreationDate;
    @ManyToMany
    @JoinColumn(name = "user_id")
    private List<User> playersIds;
    @OneToMany(mappedBy = "Characters", cascade = CascadeType.ALL)
    private List<Characters> characters;
}
