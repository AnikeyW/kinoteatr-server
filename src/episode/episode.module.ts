import { forwardRef, Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { Mp4boxService } from '../mp4box/mp4box.service';
import { SubtitlesService } from '../subtitles/subtitles.service';
import { MediainfoService } from '../mediainfo/mediainfo.service';
import { GuidesService } from '../guides/guides.service';
import { SeasonService } from '../season/season.service';
import { CacheModule } from '@nestjs/cache-manager';
import { SeriesModule } from '../series/series.module';

@Module({
  imports: [forwardRef(() => SeriesModule), CacheModule.register()],
  controllers: [EpisodeController],
  providers: [
    EpisodeService,
    PrismaService,
    FileService,
    FfmpegService,
    Mp4boxService,
    SubtitlesService,
    MediainfoService,
    GuidesService,
    SeasonService,
  ],
  exports: [EpisodeService],
})
export class EpisodeModule {}
