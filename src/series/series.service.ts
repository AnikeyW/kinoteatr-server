import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { Series } from '@prisma/client';
import { FileService, FileTypes } from '../file/file.service';
import { EditSeriesDto } from './dto/edit-series.dto';

@Injectable()
export class SeriesService {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService,
  ) {}

  async createSeries(poster: File, dto: CreateSeriesDto): Promise<Series> {
    const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);

    return this.prismaService.series.create({
      data: { ...dto, poster: posterPath, releaseYear: Number(dto.releaseYear) },
    });
  }

  async editSeriesById(dto: EditSeriesDto, poster: File | null, seriesId: number): Promise<Series> {
    if (!poster) {
      return this.prismaService.series.update({
        where: { id: seriesId },
        data: {
          title: dto.title,
          description: dto.description,
          releaseYear: Number(dto.releaseYear),
        },
      });
    } else {
      const series = await this.prismaService.series.findUnique({ where: { id: seriesId } });
      try {
        this.fileService.removeFile(series.poster);
      } catch (e) {
        console.log('при удалении постера что то пошло не так', e);
      }
      const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);
      return this.prismaService.series.update({
        where: { id: seriesId },
        data: { ...dto, poster: posterPath, releaseYear: Number(dto.releaseYear) },
      });
    }
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
