import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { Series } from '@prisma/client';
import { FileService, FileTypes } from '../file/file.service';

@Injectable()
export class SeriesService {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService,
  ) {}
  async createSeries(poster: File, dto: CreateSeriesDto): Promise<Series> {
    const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);

    const series = await this.prismaService.series.create({
      data: { ...dto, poster: posterPath, releaseYear: Number(dto.releaseYear) },
    });

    return series;
  }

  async getById(seriesId: number): Promise<Series> {
    return this.prismaService.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          where: { seriesId },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getManySeries(skip: number, take: number): Promise<Series[]> {
    return this.prismaService.series.findMany({ skip, take });
  }
}
