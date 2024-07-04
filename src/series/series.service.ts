import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const existSeriesWithSlug = await this.prismaService.series.findFirst({
      where: { slug: dto.slug },
    });

    if (existSeriesWithSlug) {
      throw new HttpException('Такой slug занят', HttpStatus.BAD_REQUEST);
    }

    const posterPath = await this.fileService.createFile(FileTypes.IMAGE, poster);

    const countriesList = JSON.parse(dto.countries).map((country) => ({ name: country }));

    const genresList = JSON.parse(dto.genres).map((genre) => ({ name: genre }));

    const { countries, genres, ...dtoResult } = dto;

    return this.prismaService.series.create({
      data: {
        ...dtoResult,
        poster: posterPath,
        releaseYear: Number(dtoResult.releaseYear),
        rateKinopoisk: Number(dtoResult.rateKinopoisk),
        rateImdb: Number(dtoResult.rateImdb),
        quality: Number(dtoResult.quality),
        countries: {
          connect: countriesList,
        },
        genres: {
          connect: genresList,
        },
      },
    });
  }

  async editSeriesById(dto: EditSeriesDto, poster: File | null, seriesId: number): Promise<Series> {
    const existSeriesWithSlug = await this.prismaService.series.findFirst({
      where: { slug: dto.slug },
    });

    if (existSeriesWithSlug) {
      throw new HttpException('Такой slug занят', HttpStatus.BAD_REQUEST);
    }

    const existingSeries = await this.prismaService.series.findUnique({
      where: { id: seriesId },
      include: { countries: true, genres: true },
    });

    const newCountriesList = JSON.parse(dto.countries);
    const newGenresList = JSON.parse(dto.genres);

    const existingCountries = existingSeries.countries.map((country) => country.name);
    const existingGenres = existingSeries.genres.map((genre) => genre.name);

    const countriesToConnect = newCountriesList
      .filter((country) => !existingCountries.includes(country))
      .map((country) => ({ name: country }));
    const genresToConnect = newGenresList
      .filter((genre) => !existingGenres.includes(genre))
      .map((genre) => ({ name: genre }));

    const countriesToDisconnect = existingCountries
      .filter((country) => !newCountriesList.includes(country))
      .map((country) => ({ name: country }));
    const genresToDisconnect = existingGenres
      .filter((genre) => !newGenresList.includes(genre))
      .map((genre) => ({ name: genre }));

    const { countries, genres, ...dtoResult } = dto;

    if (!poster) {
      return this.prismaService.series.update({
        where: { id: seriesId },
        data: {
          title: dtoResult.title,
          slug: dtoResult.slug,
          description: dtoResult.description,
          releaseYear: Number(dtoResult.releaseYear),
          rateKinopoisk: Number(dtoResult.rateKinopoisk),
          rateImdb: Number(dtoResult.rateImdb),
          quality: Number(dtoResult.quality),
          countries: {
            connect: countriesToConnect,
            disconnect: countriesToDisconnect,
          },
          genres: {
            connect: genresToConnect,
            disconnect: genresToDisconnect,
          },
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
        data: {
          ...dtoResult,
          poster: posterPath,
          releaseYear: Number(dtoResult.releaseYear),
          rateKinopoisk: Number(dtoResult.rateKinopoisk),
          rateImdb: Number(dtoResult.rateImdb),
          quality: Number(dtoResult.quality),
          countries: {
            connect: countriesToConnect,
            disconnect: countriesToDisconnect,
          },
          genres: {
            connect: genresToConnect,
            disconnect: genresToDisconnect,
          },
        },
      });
    }
  }

  async getById(seriesId: number): Promise<any> {
    const series = await this.prismaService.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          where: { seriesId },
          orderBy: { order: 'asc' },
        },
        genres: true,
        countries: true,
      },
    });

    if (!series) {
      throw new Error('Series not found');
    }

    const countries = series.countries.map((c) => c.name);
    const genres = series.genres.map((g) => g.name);

    return {
      ...series,
      countries,
      genres,
    };
  }

  async getManySeries(skip: number, take: number): Promise<Series[]> {
    return this.prismaService.series.findMany({ skip, take });
  }
}
