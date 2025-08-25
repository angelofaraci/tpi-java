package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.LevelDto;
import com.utn.javaproject.dndsheets.domain.entities.LevelEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class LevelMapperImpl implements Mapper<LevelEntity, LevelDto> {

    private ModelMapper modelMapper;

    public LevelMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public LevelDto mapTo(LevelEntity LevelEntity) {
        return modelMapper.map(LevelEntity, LevelDto.class) ;
    }

    @Override
    public LevelEntity mapFrom(LevelDto LevelDto) {
        return modelMapper.map(LevelDto, LevelEntity.class);
    }
}
