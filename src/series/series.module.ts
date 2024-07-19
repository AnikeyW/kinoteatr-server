import { forwardRef, Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { EpisodeModule } from '../episode/episode.module';

@Module({
  imports: [forwardRef(() => EpisodeModule)],
  controllers: [SeriesController],
  providers: [SeriesService, PrismaService, FileService],
  exports: [SeriesService],
})
export class SeriesModule {}
