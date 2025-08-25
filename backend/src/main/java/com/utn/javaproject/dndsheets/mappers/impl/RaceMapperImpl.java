package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.RaceDto;
import com.utn.javaproject.dndsheets.domain.entities.RaceEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class RaceMapperImpl implements Mapper<RaceEntity, RaceDto> {

    private ModelMapper modelMapper;

    public RaceMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public RaceDto mapTo(RaceEntity RaceEntity) {
        return modelMapper.map(RaceEntity, RaceDto.class) ;
    }

    @Override
    public RaceEntity mapFrom(RaceDto RaceDto) {
        return modelMapper.map(RaceDto, RaceEntity.class);
    }
}
