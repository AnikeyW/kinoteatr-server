import { Module } from '@nestjs/common';
import { SeasonService } from './season.service';
import { PrismaService } from '../prisma/prisma.service';
import { SeasonController } from './season.controller';

@Module({
  providers: [SeasonService, PrismaService],
  controllers: [SeasonController],
})
export class SeasonModule {}
