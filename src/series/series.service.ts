import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { Series } from '@prisma/client';

@Injectable()
export class SeriesService {
  constructor(private prismaService: PrismaService) {}
  async createSeries(dto: CreateSeriesDto): Promise<Series> {
    const series = await this.prismaService.series.create({ data: dto });

    return series;
  }

  async getById(seriesId: number): Promise<Series> {
    return this.prismaService.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          where: { seriesId },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }
}
