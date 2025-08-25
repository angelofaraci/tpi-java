package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.DndClassDto;
import com.utn.javaproject.dndsheets.domain.entities.DndClassEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class DndClassMapperImpl implements Mapper<DndClassEntity, DndClassDto> {

    private ModelMapper modelMapper;

    public DndClassMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public DndClassDto mapTo(DndClassEntity DndClassEntity) {
        return modelMapper.map(DndClassEntity, DndClassDto.class) ;
    }

    @Override
    public DndClassEntity mapFrom(DndClassDto DndClassDto) {
        return modelMapper.map(DndClassDto, DndClassEntity.class);
    }
}
