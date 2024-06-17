import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { Season } from '@prisma/client';
import { FileService, FileTypes } from '../file/file.service';
import { EditSeasonDto } from './dto/edit-season.dto';

@Injectable()
export class SeasonService {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService,
  ) {}

  async createSeason(dto: CreateSeasonDto, poster: File): Promise<Season> {
    console.log(dto);
    const isExistOrderNumber = await this.prismaService.season.findFirst({
      where: { order: Number(dto.order), seriesId: Number(dto.seriesId) },
    });
    if (isExistOrderNumber) {
      throw new HttpException(
        'Сезон с таким порядковым номером уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);

    return this.prismaService.season.create({
      data: {
        ...dto,
        seriesId: Number(dto.seriesId),
        order: Number(dto.order),
        poster: posterPath,
      },
    });
  }

  async editSeason(seasonId: number, dto: EditSeasonDto, poster: File | null): Promise<Season> {
    if (!poster) {
      return this.prismaService.season.update({
        where: { id: seasonId },
        data: {
          title: dto.title,
          description: dto.description,
          order: Number(dto.order),
        },
      });
    } else {
      const season = await this.prismaService.season.findUnique({ where: { id: seasonId } });
      try {
        await this.fileService.removeFile(season.poster);
      } catch (e) {
        console.log('при удалении постера что то пошло не так', e);
      }
      const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);

      return this.prismaService.season.update({
        where: { id: seasonId },
        data: {
          ...dto,
          order: Number(dto.order),
          poster: posterPath,
        },
      });
    }
  }

  async getById(seasonId: number, seriesId: number): Promise<Season> {
    const season = await this.prismaService.season.findUnique({
      where: { seriesId: seriesId, id: seasonId },
      include: {
        episodes: {
          where: { seasonId },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!season) {
      throw new HttpException('Сезон с таким Id не найден', HttpStatus.NOT_FOUND);
    }

    return season;
  }

  async getByOrder(seriesId: number, order: number): Promise<Season> {
    const season = await this.prismaService.season.findFirst({
      where: { seriesId: seriesId, order: order },
    });

    if (!season) {
      throw new HttpException('Сезон с таким порядковым номером не найден', HttpStatus.NOT_FOUND);
    }

    const seasonWithEpisodes = await this.prismaService.season.findUnique({
      where: { seriesId: seriesId, id: season.id },
      include: {
        episodes: {
          where: { seasonId: season.id },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!seasonWithEpisodes) {
      throw new HttpException('Сезон с таким Id не найден', HttpStatus.NOT_FOUND);
    }

    return seasonWithEpisodes;
  }
}
