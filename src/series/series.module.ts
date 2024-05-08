import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';

@Module({
  controllers: [SeriesController],
  providers: [SeriesService, PrismaService, FileService],
})
export class SeriesModule {}
