import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { EditSeriesDto } from './dto/edit-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('series')
export class SeriesController {
  constructor(private seriesService: SeriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('poster'))
  createSeries(@UploadedFile() poster, @Body() dto: CreateSeriesDto) {
    if (!poster) {
      throw new HttpException('Не загружен постер', HttpStatus.BAD_REQUEST);
    }
    return this.seriesService.createSeries(poster, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @UseInterceptors(FileInterceptor('poster'))
  editSeries(@UploadedFile() poster, @Body() dto: EditSeriesDto, @Param('id') seriesId) {
    return this.seriesService.editSeriesById(dto, poster, Number(seriesId));
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
