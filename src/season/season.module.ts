import { Module } from '@nestjs/common';
import { SeasonService } from './season.service';
import { PrismaService } from '../prisma/prisma.service';
import { SeasonController } from './season.controller';
import { FileService } from '../file/file.service';

@Module({
  providers: [SeasonService, PrismaService, FileService],
  controllers: [SeasonController],
})
export class SeasonModule {}
