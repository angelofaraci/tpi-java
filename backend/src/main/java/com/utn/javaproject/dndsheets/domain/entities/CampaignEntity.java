package com.utn.javaproject.dndsheets.domain.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "Campaigns")
public class CampaignEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "campaign_id_seq")
    private Long id;

    @Column(unique = true, nullable = false, updatable = false)
    private String joinCode;

    @ManyToOne

    private UserEntity dm;
    private String name;
    private String description;
    private Boolean privacy;

    // Unique so at most one campaign can ever be flagged as demo at the DB level,
    // closing the race window a check-then-insert seeder alone cannot close.
    @Column(unique = true)
    private Boolean isDemo;
    @Column(name = "CreationDate")
    private Date creationDate;
    @ManyToMany
    @JoinTable(
            name = "campaign_players",
            joinColumns = @JoinColumn(name = "campaign_id"),
            inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    private List<UserEntity> players;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL)
    private List<CharacterEntity> characters;

    @PrePersist
    void generateJoinCodeIfAbsent() {
        if (joinCode == null) {
            String raw = java.util.UUID.randomUUID().toString().replace("-", "").toUpperCase();
            joinCode = raw.substring(0, 4) + "-" + raw.substring(4, 8);
        }
        if (creationDate == null) {
            creationDate = new Date();
        }
    }

    public String getJoinCode() {
        return joinCode;
    }

    public void setJoinCode(String joinCode) {
        this.joinCode = joinCode;
    }

    public UserEntity getDm() {
        return dm;
    }

    public void setDm(UserEntity dm) {
        this.dm = dm;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getPrivacy() {
        return privacy;
    }

    public void setPrivacy(Boolean privacy) {
        this.privacy = privacy;
    }

    public Boolean getIsDemo() {
        return isDemo;
    }

    public void setIsDemo(Boolean isDemo) {
        this.isDemo = isDemo;
    }

    public Date getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(Date creationDate) {
        this.creationDate = creationDate;
    }

    public List<UserEntity> getPlayers() {
        return players;
    }

    public void setPlayers(List<UserEntity> players) {
        this.players = players;
    }

    public List<CharacterEntity> getCharacters() {
        return characters;
    }

    public void setCharacters(List<CharacterEntity> characters) {
        this.characters = characters;
    }
}
