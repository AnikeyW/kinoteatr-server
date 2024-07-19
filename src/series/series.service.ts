import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { Season, Series } from '@prisma/client';
import { FileService, FileTypes } from '../file/file.service';
import { EditSeriesDto } from './dto/edit-series.dto';
import { EpisodeService } from '../episode/episode.service';
import { subLabelFromSubSrc } from '../common/utils';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SeriesService {
  constructor(
    @Inject(forwardRef(() => EpisodeService))
    private episodeService: EpisodeService,
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

  async getById(
    seriesId: number,
  ): Promise<Series & { countries: string[]; genres: string[]; seasons: Season[] }> {
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

  async getBySlug(
    slug: string,
  ): Promise<Series & { countries: string[]; genres: string[]; seasons: Season[] }> {
    const series = await this.prismaService.series.findFirst({
      where: { slug: slug },
      include: {
        seasons: {
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

  async createPlaylist(seriesSlug: string) {
    const series = await this.getBySlug(seriesSlug);

    const allEpisodes = await this.episodeService.getAllBySeriesSlug(seriesSlug);

    if (!series || !allEpisodes)
      throw new HttpException('series or allEpisodes not found', HttpStatus.BAD_REQUEST);

    const baseUrl = process.env.SERVER_URL_STATIC.split('/api/static/')[0] + '/';

    const playlist: any = [];

    series.seasons
      .sort((a, b) => a.order - b.order)
      .forEach((season) => {
        const playlistSeason: any = {
          title: `Сезон ${season.order}`,
          folder: [],
        };
        const seasonEpisodes = allEpisodes.filter((episode) => episode.seasonId === season.id);

        seasonEpisodes
          .sort((a, b) => a.order - b.order)
          .forEach((episode) => {
            const playlistFile: Record<string, string | number> = {};

            playlistFile.id = episode.id;

            playlistFile.title = `Серия ${episode.order}`;

            const videoName = episode.srcHls.replace(/\\/g, '/').split('/')[1];
            playlistFile.file = `${baseUrl}{v1}/${videoName}/{v2}`;

            playlistFile.poster = `${process.env.SERVER_URL_STATIC}${episode.poster.replace(/\\/g, '/')}`;

            playlistFile.update_skipIntro = episode.skipIntro ? episode.skipIntro : 99999;

            playlistFile.update_skipIntroEnd = episode.skipIntroEnd ? episode.skipIntroEnd : 999999;

            playlistFile.update_skipRepeat = episode.skipRepeat ? episode.skipRepeat : 0;

            playlistFile.update_skipRepeatEnd = episode.skipRepeatEnd ? episode.skipRepeatEnd : 0;

            playlistFile.update_skipCredits = episode.skipCredits ? episode.skipCredits : 99999;

            if (episode.subtitles.length > 0) {
              let subtitlesSrc = '';

              episode.subtitles.forEach((sub, index) => {
                const subLabel = subLabelFromSubSrc(sub.src);
                if (index === episode.subtitles.length - 1) {
                  subtitlesSrc += `[${subLabel}]${process.env.SERVER_URL_STATIC + episode.subtitles[index].src.replace(/\\/g, '/')}`;
                } else {
                  subtitlesSrc += `[${subLabel}]${process.env.SERVER_URL_STATIC + episode.subtitles[index].src.replace(/\\/g, '/')},`;
                }
              });

              playlistFile.subtitle = subtitlesSrc;
            }

            if (episode.defaultSubtitle) {
              playlistFile.default_subtitle = subLabelFromSubSrc(episode.defaultSubtitle);
            }

            playlistSeason.folder.push(playlistFile);
          });

        playlist.push(playlistSeason);
      });

    const playlistFolderPath = path.join(__dirname, '..', '..', 'static', 'playlists');
    const playlistPath = path.join(playlistFolderPath, `${seriesSlug}.txt`);

    if (!fs.existsSync(playlistFolderPath)) {
      try {
        fs.mkdirSync(playlistFolderPath, { recursive: true });
      } catch (err) {
        throw new HttpException(
          'Error creating playlists directory',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    try {
      fs.writeFileSync(playlistPath, JSON.stringify(playlist), 'utf8');
    } catch (err) {
      throw new HttpException('Error writing playlist to file', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const playlistPathStatic = path.join('playlists', `${seriesSlug}.txt`).replace(/\\/g, '/');

    await this.prismaService.series.update({
      where: { id: series.id },
      data: { playlist: playlistPathStatic },
    });

    return playlistPathStatic;
  }
}
