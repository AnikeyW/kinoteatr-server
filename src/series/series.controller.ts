import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Get()
  getManySeries(@Query() query: { skip: string; take: string }) {
    const { skip, take } = query;

    return this.seriesService.getManySeries(skip ? Number(skip) : 0, take ? Number(take) : 20);
  }
}
