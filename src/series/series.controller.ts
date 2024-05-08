import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('series')
export class SeriesController {
  constructor(private seriesService: SeriesService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'poster', maxCount: 1 }]))
  createSeries(@UploadedFiles() files, @Body() dto: CreateSeriesDto) {
    const { poster } = files;
    if (!poster) {
      throw new HttpException('Не загружен постер', HttpStatus.BAD_REQUEST);
    }
    return this.seriesService.createSeries(poster[0], dto);
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
