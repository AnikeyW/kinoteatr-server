import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promisify } from 'util';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { Episode, Subtitles } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as uuid from 'uuid';
import * as fsExtra from 'fs-extra';
import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { FileService } from '../file/file.service';
import { Mp4boxService } from '../mp4box/mp4box.service';
import { EditEpisodeDto, IExistSubtitles } from './dto/edit-episode.dto';

const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class EpisodeService {
  constructor(
    private prismaService: PrismaService,
    private ffmpegService: FfmpegService,
    private mp4boxService: Mp4boxService,
    private fileService: FileService,
  ) {}

  async createEpisode(
    videoTmpPath: string,
    subtitlesTmpList: { path: string }[],
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

    try {
      const episodeName = uuid.v4();
      const THUMB_QUANTITY = 20;

      const videoDuration = await this.ffmpegService.getVideoDuration(videoTmpPath);

      await this.createThumbnailsFolder(episodeName);
      await this.ffmpegService.extractThumbnails(
        videoTmpPath,
        videoDuration,
        THUMB_QUANTITY,
        episodeName,
      );

      const thumbnails = [];
      for (let i = 1; i <= THUMB_QUANTITY; i++) {
        thumbnails.push(path.join('thumbnails', episodeName, `thumbnail_${i}.webp`));
      }

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
          srcHls: '',
          srcDash: '',
          poster: thumbnails[10],
          thumbnails: thumbnails,
          isProcessing: true,
          releaseDate: new Date(dto.releaseDate),
        },
      });

      if (subtitlesTmpList.length > 0) {
        const subtitlesStaticPath = path.join(
          __dirname,
          '..',
          '..',
          'static',
          'subtitles',
          episodeName,
        );

        const saveSubtitles = async (subtitlesTmpList) => {
          for (const subtitleTmp of subtitlesTmpList) {
            const subPath = this.fileService.moveFileToStatic(
              subtitleTmp.path,
              subtitlesStaticPath,
            );
            await this.prismaService.subtitles.create({
              data: { src: subPath, episodeId: episode.id },
            });
          }
        };

        await saveSubtitles(subtitlesTmpList);
      }

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

      const hlsPath = path.join('video', episodeName, 'master.m3u8');
      const dashPath = path.join('video', episodeName, 'master.mpd');

      await this.createEpisodeFolder(episodeName);

      this.ffmpegService
        .toHlsUsingVideoCard(videoTmpPath, episodeName, resolutions)
        .then(() => {
          console.log('Все потоки ffmpeg завершены.');
        })
        .then(() => {
          this.mp4boxService.toMpdFromHls(episodeName);
        })
        .then(async () => {
          await this.prismaService.episode.update({
            where: { id: episode.id },
            data: {
              isProcessing: false,
              srcHls: hlsPath,
              srcDash: dashPath,
            },
          });
        })
        .catch((error) => {
          console.error(`Ошибка при выполнении команды: ${error}`);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
          // todo: мб удалить эпизод из бд и удалить постер из статики и прекратить работу ffmpeg
        })
        .finally(() => {
          fsExtra.remove(path.join(__dirname, '..', '..', '/tmp'));
        });

      return { ...episode };
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async editEpisode(
    dto: EditEpisodeDto,
    episodeId: number,
    newSubtitlesTmpList: { path: string }[],
  ): Promise<Episode & { subtitles: Subtitles[] }> {
    const existEpisode = await this.getById(episodeId);
    if (!existEpisode) {
      throw new HttpException('Эпизод с таким Id не найден', HttpStatus.NOT_FOUND);
    }

    // const episodeName = existEpisode.thumbnails[0].replace(/\\/g, '/').split('/')[1];
    const episodeName = existEpisode.poster.replace(/\\/g, '/').split('/')[1].split('.')[0];

    const existSubs: IExistSubtitles[] = JSON.parse(dto.existSubtitles);

    if (existSubs.length !== existEpisode.subtitles.length) {
      const existSubsIds = new Set(existSubs.map((subtitle) => subtitle.id));

      const subtitlesToDelete = existEpisode.subtitles.filter(
        (subtitle) => !existSubsIds.has(subtitle.id),
      );

      const staticFolderPath = path.resolve(__dirname, '..', '..', 'static');

      for (const subtitle of subtitlesToDelete) {
        const subtitlePath = path.join(staticFolderPath, subtitle.src);

        await this.prismaService.subtitles.delete({ where: { id: subtitle.id } });

        fs.unlink(subtitlePath, (err) => {
          if (err) {
            console.error(`Ошибка при удалении файла: ${subtitlePath}`, err);
          } else {
            console.log(`Файл удален: ${subtitlePath}`);
          }
        });
      }
    }

    if (newSubtitlesTmpList?.length > 0) {
      const subtitlesStaticPath = path.join(
        __dirname,
        '..',
        '..',
        'static',
        'subtitles',
        episodeName,
      );

      const saveSubtitles = async (subtitlesTmpList) => {
        for (const subtitleTmp of subtitlesTmpList) {
          const subPath = this.fileService.moveFileToStatic(subtitleTmp.path, subtitlesStaticPath);
          await this.prismaService.subtitles.create({
            data: { src: subPath, episodeId: episodeId },
          });
        }
      };

      await saveSubtitles(newSubtitlesTmpList);
    }

    return this.prismaService.episode.update({
      where: { id: episodeId },
      data: {
        title: dto.title,
        description: dto.description,
        order: Number(dto.order),
        poster: dto.poster,
        releaseDate: new Date(dto.releaseDate),
        skipCredits: dto.skipCredits ? Number(dto.skipCredits) : null,
        skipIntro: dto.skipIntro ? Number(dto.skipIntro) : null,
        skipRepeat: dto.skipRepeat ? Number(dto.skipRepeat) : null,
      },
      include: { subtitles: true },
    });
  }

  async getById(episodeId: number): Promise<Episode & { subtitles: Subtitles[] }> {
    const episode = this.prismaService.episode.findUnique({
      where: { id: episodeId },
      include: {
        subtitles: true,
      },
    });
    if (!episode) {
      throw new HttpException('Епизод не найден', HttpStatus.NOT_FOUND);
    }
    return episode;
  }

  async getByOrder(
    seasonOrder: number,
    seriesId: number,
    episodeOrder: number,
  ): Promise<Episode & { subtitles: Subtitles[] }> {
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
      include: {
        subtitles: true,
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

  private async createThumbnailsFolder(episodeName: string) {
    const folderVideoPath = path.join(__dirname, '..', '..', 'static', 'thumbnails', episodeName);
    await mkdirAsync(folderVideoPath, { recursive: true });
  }
}
