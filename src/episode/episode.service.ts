import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
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
import { SubtitlesService } from '../subtitles/subtitles.service';
import { MediainfoService } from '../mediainfo/mediainfo.service';
import { SeasonService } from '../season/season.service';

@Injectable()
export class EpisodeService {
  constructor(
    private prismaService: PrismaService,
    private ffmpegService: FfmpegService,
    private mp4boxService: Mp4boxService,
    private fileService: FileService,
    private subtitlesService: SubtitlesService,
    private mediainfoService: MediainfoService,
    private seasonService: SeasonService,
  ) {}

  async createEpisode(videoTmpPath: string, dto: CreateEpisodeDto) {
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

      const videoInfo = await this.mediainfoService.getVideoInfo(videoTmpPath);

      const thumbnailsPaths = await this.ffmpegService.extractThumbnails(
        videoTmpPath,
        videoInfo.duration,
        episodeName,
      );

      const episode = await this.prismaService.episode.create({
        data: {
          title: dto.title,
          description: dto.description,
          order: Number(dto.order),
          skipRepeat: Number(dto.skipRepeat),
          skipRepeatEnd: Number(dto.skipRepeatEnd),
          skipIntro: Number(dto.skipIntro),
          skipIntroEnd: Number(dto.skipIntroEnd),
          skipCredits: Number(dto.skipCredits),
          seasonId: Number(dto.seasonId),
          duration: videoInfo.duration,
          srcHls: '',
          srcDash: '',
          poster: thumbnailsPaths[10],
          thumbnails: thumbnailsPaths,
          isProcessing: true,
          releaseDate: new Date(dto.releaseDate),
          width: videoInfo.resolution.width,
          height: videoInfo.resolution.height,
        },
      });

      const subtitlesList = await this.ffmpegService.extractSubtitles(
        videoTmpPath,
        episodeName,
        videoInfo,
      );

      await this.subtitlesService.saveSubtitles(subtitlesList, episode.id, episodeName);

      this.ffmpegService
        .toHlsUsingVideoCard(videoTmpPath, episodeName, videoInfo)
        .then((hlsPathFromStatic) => {
          return this.mp4boxService.toMpdFromHls(episodeName, hlsPathFromStatic);
        })
        .then(async (data) => {
          await this.prismaService.episode.update({
            where: { id: episode.id },
            data: {
              isProcessing: false,
              srcHls: data.hlsPathFromStatic,
              srcDash: data.dashPathFromStatic,
            },
          });
        })
        .then(() => {
          this.deleteTemporaryFiles([videoTmpPath]);
        })
        .catch((error) => {
          console.error(`Ошибка при выполнении команды: ${error}`);
          this.deleteTemporaryFiles([videoTmpPath]);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
          // todo: мб удалить эпизод из бд и удалить постер из статики и прекратить работу ffmpeg
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
        skipIntroEnd: dto.skipIntro ? Number(dto.skipIntroEnd) : null,
        skipRepeat: dto.skipRepeat ? Number(dto.skipRepeat) : null,
        skipRepeatEnd: dto.skipRepeat ? Number(dto.skipRepeatEnd) : null,
        width: Number(dto.width),
        height: Number(dto.height),
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
    seriesSlug: string,
    episodeOrder: number,
  ): Promise<Episode & { subtitles: Subtitles[] }> {
    const season = await this.seasonService.getByOrder(seriesSlug, seasonOrder);

    if (!season) {
      throw new HttpException('Сезон с таким порядковым номером не найден', HttpStatus.NOT_FOUND);
    }

    const episode = await this.prismaService.episode.findFirst({
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

  async deleteEpisode(episodeId: number) {
    try {
      const episode = await this.getById(episodeId);
      if (!episode) {
        throw new HttpException('Эпизод не найден', HttpStatus.NOT_FOUND);
      }

      const episodeName = episode.poster.replace(/\\/g, '/').split('/')[1].split('.')[0];

      const staticPath = path.join(__dirname, '..', '..', 'static');

      // Удалить thumbnails
      const thumbnailsDir = path.join(staticPath, 'thumbnails', episodeName);
      if (fs.existsSync(thumbnailsDir)) {
        await fsExtra.remove(thumbnailsDir);
        console.log(`Deleted thumbnails directory: ${thumbnailsDir}`);
      }

      // Удалить папку с видео
      const videoDir = path.join(staticPath, 'video', episodeName);
      if (fs.existsSync(videoDir)) {
        await fsExtra.remove(videoDir);
        console.log(`Deleted video directory: ${videoDir}`);
      }

      // Удалить субтитры, если есть
      const subtitlesDir = path.join(staticPath, 'subtitles', episodeName);
      if (fs.existsSync(subtitlesDir)) {
        await fsExtra.remove(subtitlesDir);
        console.log(`Deleted subtitles directory: ${subtitlesDir}`);
      }

      // Удалить эпизод из БД
      await this.prismaService.episode.delete({ where: { id: episodeId } });
      return episode;
    } catch (e) {
      throw new HttpException('Ошибка удаления', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async deleteTemporaryFiles(filesToDelete: string[]): Promise<void> {
    try {
      for (const filePath of filesToDelete) {
        await fsExtra.remove(filePath);
      }
    } catch (error) {
      console.error(`Ошибка при удалении временных файлов: ${error}`);
    }
  }
}
