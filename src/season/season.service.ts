import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { Season } from '@prisma/client';

@Injectable()
export class SeasonService {
  constructor(private prismaService: PrismaService) {}

  async createSeason(dto: CreateSeasonDto): Promise<Season> {
    const isExistOrderNumber = await this.prismaService.season.findFirst({
      where: { order: Number(dto.order), seriesId: dto.seriesId },
    });
    if (isExistOrderNumber) {
      throw new HttpException(
        'Сезон с таким порядковым номером уже существует',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prismaService.season.create({ data: dto });
  }

  async getById(seasonId: number, seriesId: number): Promise<Season> {
    const season = await this.prismaService.season.findUnique({
      where: { seriesId: seriesId, id: seasonId },
      include: {
        episodes: {
          where: { seasonId },
          // select: {
          //   id: true,
          //   title: true,
          //   description: true,
          //   order: true,
          //   skipIntro: true,
          //   skipRepeat: true,
          //   skipCredits: true,
          //   qualities: true,
          //   voices: true,
          //   videos: true,
          // },
        },
      },
    });

    if (!season) {
      throw new HttpException('Сезон с таким Id не найден', HttpStatus.NOT_FOUND);
    }

    return season;
  }
}
