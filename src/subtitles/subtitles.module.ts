import { Module } from '@nestjs/common';
import { SubtitlesService } from './subtitles.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [SubtitlesService, PrismaService],
})
export class SubtitlesModule {}
