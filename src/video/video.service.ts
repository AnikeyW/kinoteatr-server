import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateVideoDto } from './dto/create-video.dto';
import { FileService } from '../file/file.service';
import * as path from 'path';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import { PrismaService } from '../prisma/prisma.service';
import { Video } from '@prisma/client';

@Injectable()
export class VideoService {
  constructor(
    private fileService: FileService,
    private prismaService: PrismaService,
  ) {}

  async uploadVideo(fileTmpPath: string, dto: CreateVideoDto): Promise<Video> {
    if (!fs.existsSync(fileTmpPath)) {
      throw new HttpException('Видео не найдено', HttpStatus.NOT_FOUND);
    }

    //перемещаем загруженное видео из временной папки в статику и удаляю временную папку
    const folderVideoPath = path.join(__dirname, '..', '..', 'static', 'video');
    const staticFullPath = this.fileService.moveFile(fileTmpPath, folderVideoPath);
    await fsExtra.remove(path.join(__dirname, '..', '..', '/tmp'));
    const videoPath = path.relative(path.join(__dirname, '..', '..', 'static'), staticFullPath);

    const video = await this.prismaService.video.create({
      data: { quality: dto.quality, voice: dto.voice, episodeId: dto.episodeId, src: videoPath },
    });

    return video;
  }

  // async getById(id: number): Promise<Video> {
  //   const video = await this.prismaService.video.findUnique({ where: { id } });
  //
  //   if (!video) {
  //     throw new HttpException('Видео с данным Id не найдено', HttpStatus.NOT_FOUND);
  //   }
  //
  //   return video;
  // }
}
