import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { Episode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';
import { CreateVideoDto } from '../video/dto/create-video.dto';

@Injectable()
export class EpisodeService {
  constructor(
    private prismaService: PrismaService,
    private videoService: VideoService,
  ) {}

  async createEpisode(videoTmpPath: string, dto: CreateEpisodeDto): Promise<Episode> {
    const isExistOrderNumber = await this.prismaService.episode.findFirst({
      where: { order: Number(dto.order), seasonId: Number(dto.seasonId) },
    });
    if (isExistOrderNumber) {
      throw new HttpException(
        'Эпизод с таким порядковым номером уже существует',
        HttpStatus.BAD_REQUEST,
      );
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
        qualities: [dto.quality],
        voices: [dto.voice],
      },
    });

    const createVideoDto: CreateVideoDto = {
      episodeId: episode.id,
      voice: dto.voice,
      quality: dto.quality,
    };

    await this.videoService.uploadVideo(videoTmpPath, createVideoDto);

    return this.prismaService.episode.findUnique({
      where: { id: episode.id },
      include: { videos: { where: { episodeId: episode.id } } },
    });
  }
}
