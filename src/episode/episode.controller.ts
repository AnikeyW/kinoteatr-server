import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { EpisodeService } from './episode.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as mime from 'mime-types';
import * as uuid from 'uuid';
import * as fs from 'fs';
import { EditEpisodeDto } from './dto/edit-episode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Timeout } from '../common/decorators/timeout.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const storage = diskStorage({
  destination: function (req, file, cb) {
    const tmpFolderPath = path.join(__dirname, '..', '..', '/tmp/uploads');
    if (!fs.existsSync(tmpFolderPath)) {
      fs.mkdirSync(tmpFolderPath, { recursive: true });
    }
    cb(null, tmpFolderPath);
  },
  filename: function (req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() === '.vtt') {
      file.mimetype = 'text/vtt';
    }
    const fileExtension = mime.extension(file.mimetype);
    let fileName = uuid.v4() + '.' + fileExtension;
    if (path.extname(file.originalname).toLowerCase() === '.vtt') {
      fileName = file.originalname;
    }
    cb(null, fileName);
  },
});

@Controller('episode')
export class EpisodeController {
  constructor(
    private episodeService: EpisodeService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // @UseGuards(JwtAuthGuard)
  @Post()
  @Timeout(1200000) //20 min
  @UseInterceptors(FileFieldsInterceptor([{ name: 'video', maxCount: 1 }], { storage: storage }))
  createEpisode(@UploadedFiles() files, @Body() dto: CreateEpisodeDto) {
    const { video } = files;
    if (!video) {
      throw new HttpException('Не загружено видео', HttpStatus.BAD_REQUEST);
    }
    return this.episodeService.createEpisode(video[0].path, dto);
  }

  // @UseGuards(JwtAuthGuard)
  @Post(':id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'newSubtitles', maxCount: 15 }], { storage: storage }),
  )
  editEpisode(@UploadedFiles() files, @Param('id') episodeId, @Body() dto: EditEpisodeDto) {
    const { newSubtitles } = files;
    return this.episodeService.editEpisode(dto, Number(episodeId), newSubtitles);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteEpisode(@Param('id') episodeId) {
    return this.episodeService.deleteEpisode(+episodeId);
  }

  @Get('/byOrder/:order')
  getByOrder(
    @Param('order') order,
    @Query('season_order') seasonOrder,
    @Query('series_slug') seriesSlug,
  ) {
    return this.episodeService.getByOrder(Number(seasonOrder), seriesSlug, Number(order));
  }

  @Get('byId/:id')
  getById(@Param('id') episodeId) {
    return this.episodeService.getById(Number(episodeId));
  }

  @Get('getAll')
  async getAllBySeriesSlug(@Query('series_slug') seriesSlug) {
    const cacheKey = `getAllEpisodesBySeriesSlug:${seriesSlug}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    const data = await this.episodeService.getAllBySeriesSlug(seriesSlug);
    await this.cacheManager.set(cacheKey, data, 60000); //1 min
    return data;
  }
}
