import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promisify } from 'util';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { Episode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as uuid from 'uuid';
import * as fsExtra from 'fs-extra';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { FileService } from '../file/file.service';

const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class EpisodeService {
  constructor(
    private prismaService: PrismaService,
    private ffmpegService: FfmpegService,
    private fileService: FileService,
  ) {}

  async createEpisode(
    videoTmpPath: string,
    posterTmpPath: string,
    dto: CreateEpisodeDto,
  ): Promise<Episode> {
    const isExistOrderNumber = await this.prismaService.episode.findFirst({
      where: { order: Number(dto.order), seasonId: Number(dto.seasonId) },
    });
    if (isExistOrderNumber) {
      throw new HttpException(
        'Эпизод с таким порядковым номером уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    const imagePath = path.join(__dirname, '..', '..', 'static', 'image');

    const posterPath = this.fileService.moveFileToStatic(posterTmpPath, imagePath);

    const videoDuration = await this.ffmpegService.getVideoDuration(videoTmpPath);

    const episode = await this.prismaService.episode.create({
      data: {
        title: dto.title,
        description: dto.description,
        order: Number(dto.order),
        skipRepeat: Number(dto.skipRepeat),
        skipIntro: Number(dto.skipIntro),
        skipCredits: Number(dto.skipCredits),
        seasonId: Number(dto.seasonId),
        duration: videoDuration,
        src: '',
        poster: posterPath,
        isProcessing: true,
        releaseDate: new Date(Number(dto.releaseDate)),
      },
    });

    const resolutionsList = [
      '320x240',
      '640x360',
      '854x480',
      '1280x720',
      '1920x1080',
      '2560x1440',
      '3840x2160',
      '7680x4320',
    ];

    const uploadedVideoResolution = await this.ffmpegService.getVideoResolution(videoTmpPath);

    const resolutions = resolutionsList.filter(
      (r) => Number(r.split('x')[1]) <= uploadedVideoResolution.height,
    );

    const episodeName = uuid.v4();

    const videoPath = path.join('video', episodeName, 'master.m3u8');

    await this.createEpisodeFolder(episodeName);

    this.ffmpegService
      // .toHls(videoTmpPath, episodeName, resolutions)
      // .toHlsAndDash(videoTmpPath, episodeName, resolutions)
      .toHlsUsingVideoCard(videoTmpPath, episodeName, resolutions)
      .then(async () => {
        console.log('Все потоки ffmpeg завершены.');
        await this.prismaService.episode.update({
          where: { id: episode.id },
          data: {
            isProcessing: false,
            src: videoPath,
          },
        });
      })
      .catch((error) => {
        console.error(`Ошибка при выполнении команды: ${error}`);
        // Обработка ошибки
        // todo: мб удалить эпизод из бд и удалить постер из статики и прекратить работу ffmpeg
      })
      .finally(() => {
        fsExtra.remove(path.join(__dirname, '..', '..', '/tmp'));
      });

    return { ...episode };
  }

  async getById(episodeId: number): Promise<Episode> {
    const episode = this.prismaService.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new HttpException('Епизод не найден', HttpStatus.NOT_FOUND);
    }
    return episode;
  }

  async getByOrder(seasonOrder: number, seriesId: number, episodeOrder: number): Promise<Episode> {
    const season = await this.prismaService.season.findUnique({
      where: { seriesId: seriesId, order: seasonOrder },
    });

    if (!season) {
      throw new HttpException('Сезон с таким порядковым номером не найден', HttpStatus.NOT_FOUND);
    }

    const episode = await this.prismaService.episode.findUnique({
      where: {
        seasonId: season.id,
        order: episodeOrder,
      },
    });

    if (!episode) {
      throw new HttpException('Епизод не найден', HttpStatus.NOT_FOUND);
    }

    return episode;
  }

  private async createEpisodeFolder(episodeName: string) {
    const folderVideoPath = path.join(__dirname, '..', '..', 'static', 'video', episodeName);
    await mkdirAsync(folderVideoPath, { recursive: true });
  }
}
