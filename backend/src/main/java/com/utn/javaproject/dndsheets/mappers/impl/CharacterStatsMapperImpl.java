package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.CharacterStatsDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterStatsEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class CharacterStatsMapperImpl implements Mapper<CharacterStatsEntity, CharacterStatsDto> {

    private ModelMapper modelMapper;

    public CharacterStatsMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public CharacterStatsDto mapTo(CharacterStatsEntity CharacterStatsEntity) {
        return modelMapper.map(CharacterStatsEntity, CharacterStatsDto.class) ;
    }

    @Override
    public CharacterStatsEntity mapFrom(CharacterStatsDto CharacterStatsDto) {
        return modelMapper.map(CharacterStatsDto, CharacterStatsEntity.class);
    }
}
