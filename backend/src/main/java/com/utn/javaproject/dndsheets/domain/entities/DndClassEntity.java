package com.utn.javaproject.dndsheets.domain.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(
        name = "Class",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_class_name", columnNames = {"name"})
        }
)
public class DndClassEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "class_id_seq")
    @SequenceGenerator(name = "class_id_seq", sequenceName = "class_id_seq", allocationSize = 1)
    private Long id;

    /**
     * Nullable to avoid breaking existing DBs when using spring.jpa.hibernate.ddl-auto=update.
     * Uniqueness is enforced at the DB level for non-null values.
     */
    @Column(nullable = true)
    private String name;

    private String description;

    @Lob
    @Builder.Default
    private HashMap<Short, String> levelCharacteristics = new HashMap<>();
    private Integer hitDice;

    @ElementCollection
    @CollectionTable(
        name = "dnd_class_saving_throws",
        joinColumns = @JoinColumn(name = "class_id")
    )
    @Column(name = "saving_throw")
    @Builder.Default
    private List<String> savingThrows = new ArrayList<>();

    @PrePersist
    @PreUpdate
    @PostLoad
    void normalize() {
        if (levelCharacteristics == null) {
            levelCharacteristics = new HashMap<>();
        }
        if (savingThrows == null) {
            savingThrows = new ArrayList<>();
        }
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getHitDice() {
        return hitDice;
    }

    public void setHitDice(Integer hitDice) {
        this.hitDice = hitDice;
    }

}
