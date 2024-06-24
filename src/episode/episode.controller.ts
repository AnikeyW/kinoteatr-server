import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
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
  constructor(private episodeService: EpisodeService) {}

  // @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'subtitles', maxCount: 15 },
      ],
      { storage: storage },
    ),
  )
  createEpisode(@UploadedFiles() files, @Body() dto: CreateEpisodeDto) {
    const { video, subtitles } = files;
    if (!video) {
      throw new HttpException('Не загружено видео', HttpStatus.BAD_REQUEST);
    }
    return this.episodeService.createEpisode(video[0].path, subtitles ? subtitles : [], dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'newSubtitles', maxCount: 15 }], { storage: storage }),
  )
  editEpisode(@UploadedFiles() files, @Param('id') episodeId, @Body() dto: EditEpisodeDto) {
    const { newSubtitles } = files;
    return this.episodeService.editEpisode(dto, Number(episodeId), newSubtitles);
  }

  // @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteEpisode(@Param('id') episodeId) {
    return this.episodeService.deleteEpisode(+episodeId);
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
