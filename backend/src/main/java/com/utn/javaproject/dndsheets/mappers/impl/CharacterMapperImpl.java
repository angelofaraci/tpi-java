package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.CharacterDto;
import com.utn.javaproject.dndsheets.domain.entities.CharacterEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class CharacterMapperImpl implements Mapper<CharacterEntity, CharacterDto> {

    private ModelMapper modelMapper;

    public CharacterMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public CharacterDto mapTo(CharacterEntity CharacterEntity) {
        return modelMapper.map(CharacterEntity, CharacterDto.class) ;
    }

    @Override
    public CharacterEntity mapFrom(CharacterDto CharacterDto) {
        return modelMapper.map(CharacterDto, CharacterEntity.class);
    }
}

