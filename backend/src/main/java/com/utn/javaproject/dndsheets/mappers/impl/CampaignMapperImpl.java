package com.utn.javaproject.dndsheets.mappers.impl;

import com.utn.javaproject.dndsheets.domain.dto.CampaignDto;
import com.utn.javaproject.dndsheets.domain.entities.CampaignEntity;
import com.utn.javaproject.dndsheets.mappers.Mapper;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Component;

@Component
public class CampaignMapperImpl implements Mapper<CampaignEntity, CampaignDto> {

    private ModelMapper modelMapper;

    public CampaignMapperImpl(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

    @Override
    public CampaignDto mapTo(CampaignEntity CampaignEntity) {
        return modelMapper.map(CampaignEntity, CampaignDto.class) ;
    }

    @Override
    public CampaignEntity mapFrom(CampaignDto CampaignDto) {
        return modelMapper.map(CampaignDto, CampaignEntity.class);
    }
}
