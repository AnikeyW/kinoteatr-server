import { Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';
import { FileService } from '../file/file.service';

@Module({
  controllers: [EpisodeController],
  providers: [EpisodeService, PrismaService, VideoService, FileService],
})
export class EpisodeModule {}
