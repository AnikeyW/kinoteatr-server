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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SeasonService } from './season.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EditSeasonDto } from './dto/edit-season.dto';

@Controller('season')
export class SeasonController {
  constructor(private seasonService: SeasonService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('poster'))
  createSeason(@UploadedFile() poster, @Body() dto: CreateSeasonDto) {
    if (!poster) {
      throw new HttpException('Не загружен постер', HttpStatus.BAD_REQUEST);
    }
    return this.seasonService.createSeason(dto, poster);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @UseInterceptors(FileInterceptor('poster'))
  editSeason(@UploadedFile() poster, @Body() dto: EditSeasonDto, @Param('id') seasonId) {
    return this.seasonService.editSeason(Number(seasonId), dto, poster);
  }

  @Get('byId/:id')
  getById(@Param('id') seasonId, @Query('series_id') seriesId) {
    return this.seasonService.getById(Number(seasonId), Number(seriesId));
  }

  @Get(':order')
  getByOrder(@Param('order') order, @Query('series_slug') seriesSlug) {
    return this.seasonService.getByOrder(seriesSlug, Number(order));
  }
}
