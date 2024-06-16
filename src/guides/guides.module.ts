import { Module } from '@nestjs/common';
import { GuidesService } from './guides.service';
import { GuidesController } from './guides.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [GuidesService, PrismaService],
  controllers: [GuidesController],
})
export class GuidesModule {}
