import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SeasonService } from './season.service';
import { CreateSeasonDto } from './dto/create-season.dto';

@Controller('season')
export class SeasonController {
  constructor(private seasonService: SeasonService) {}

  @Post()
  createSeason(@Body() dto: CreateSeasonDto) {
    return this.seasonService.createSeason(dto);
  }

  @Get(':id')
  getById(@Param('id') seasonId, @Query('series_id') seriesId) {
    console.log(seriesId);
    return this.seasonService.getById(Number(seasonId), Number(seriesId));
  }
}
