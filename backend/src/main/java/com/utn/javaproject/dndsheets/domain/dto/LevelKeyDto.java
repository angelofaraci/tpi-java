package com.utn.javaproject.dndsheets.domain.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LevelKeyDto implements Serializable {
    private Long characterId;
    private Long classId;

}