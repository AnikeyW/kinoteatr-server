import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { countriesList } from './countriesList';
import { genresList } from './genresList';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.seedCountries();
    await this.seedGenres();
  }

  private async seedCountries() {
    for (const country of countriesList) {
      await this.countries.upsert({
        where: { name: country.name },
        update: {},
        create: {
          name: country.name,
        },
      });
    }

    console.log('Countries seeded');
  }

  private async seedGenres() {
    for (const genre of genresList) {
      await this.genre.upsert({
        where: { name: genre.name },
        update: {},
        create: {
          name: genre.name,
        },
      });
    }

    console.log('Genres seeded');
  }
}
