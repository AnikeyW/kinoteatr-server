import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { FileService } from '../file/file.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [VideoService, FileService, PrismaService],
})
export class VideoModule {}
