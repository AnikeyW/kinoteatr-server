import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuidesService {
  constructor(private prismaService: PrismaService) {}

  async getCountries(): Promise<string[]> {
    const countries = await this.prismaService.countries.findMany({ select: { name: true } });

    return countries.map((country) => country.name);
  }

  async getGenres(): Promise<string[]> {
    const genres = await this.prismaService.genre.findMany({ select: { name: true } });

    return genres.map((genre) => genre.name);
  }
}
