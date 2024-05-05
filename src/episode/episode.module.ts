import { Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';

@Module({
  controllers: [EpisodeController],
  providers: [EpisodeService, PrismaService, FileService, FfmpegService],
})
export class EpisodeModule {}
