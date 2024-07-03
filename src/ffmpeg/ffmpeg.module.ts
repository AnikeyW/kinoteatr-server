import { Module } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';
import { GuidesService } from '../guides/guides.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [FfmpegService, GuidesService, PrismaService],
})
export class FfmpegModule {}
