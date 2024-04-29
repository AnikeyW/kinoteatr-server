import { Module } from '@nestjs/common';
import { VideoModule } from './video/video.module';
import { FileModule } from './file/file.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SeriesModule } from './series/series.module';
import { EpisodeModule } from './episode/episode.module';
import { SeasonModule } from './season/season.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
    }),
    ConfigModule.forRoot(),
    VideoModule,
    FileModule,
    PrismaModule,
    SeriesModule,
    EpisodeModule,
    SeasonModule,
  ],
})
export class AppModule {}
