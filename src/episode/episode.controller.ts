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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { EpisodeService } from './episode.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as mime from 'mime-types';
import * as uuid from 'uuid';
import * as fs from 'fs';

const storage = diskStorage({
  destination: function (req, file, cb) {
    const tmpFolderPath = path.join(__dirname, '..', '..', '/tmp/uploads');
    if (!fs.existsSync(tmpFolderPath)) {
      fs.mkdirSync(tmpFolderPath, { recursive: true });
    }
    cb(null, tmpFolderPath);
  },
  filename: function (req, file, cb) {
    const fileExtension = mime.extension(file.mimetype);
    const fileName = uuid.v4() + '.' + fileExtension;
    cb(null, fileName);
  },
});

@Controller('episode')
export class EpisodeController {
  constructor(private episodeService: EpisodeService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'poster', maxCount: 1 },
      ],
      { storage: storage },
    ),
  )
  createEpisode(@UploadedFiles() files, @Body() dto: CreateEpisodeDto) {
    const { video, poster } = files;
    if (!video) {
      throw new HttpException('Не загружено видео', HttpStatus.BAD_REQUEST);
    }
    if (!poster) {
      throw new HttpException('Не загружен постер', HttpStatus.BAD_REQUEST);
    }
    return this.episodeService.createEpisode(video[0].path, poster[0].path, dto);
  }

  @Get(':order')
  getByOrder(
    @Param('order') order,
    @Query('season_order') seasonOrder,
    @Query('series_id') seriesId,
  ) {
    return this.episodeService.getByOrder(Number(seasonOrder), Number(seriesId), Number(order));
  }

  @Get('byId/:id')
  getById(@Param('id') episodeId) {
    return this.episodeService.getById(Number(episodeId));
  }
}
