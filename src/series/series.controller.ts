import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';

@Controller('series')
export class SeriesController {
  constructor(private seriesService: SeriesService) {}

  @Post()
  createSeries(@Body() dto: CreateSeriesDto) {
    return this.seriesService.createSeries(dto);
  }

  @Get(':id')
  getById(@Param('id') seriesId) {
    return this.seriesService.getById(Number(seriesId));
  }
}
