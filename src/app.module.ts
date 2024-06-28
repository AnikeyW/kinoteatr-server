import { Module } from '@nestjs/common';
import { FileModule } from './file/file.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SeriesModule } from './series/series.module';
import { EpisodeModule } from './episode/episode.module';
import { SeasonModule } from './season/season.module';
import { FfmpegModule } from './ffmpeg/ffmpeg.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { Mp4boxModule } from './mp4box/mp4box.module';
import { GuidesModule } from './guides/guides.module';
import { SubtitlesModule } from './subtitles/subtitles.module';
import { MediainfoModule } from './mediainfo/mediainfo.module';
import * as process from 'process';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
      serveRoot: '/api/static',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
      global: true,
    }),
    ConfigModule.forRoot(),
    FileModule,
    PrismaModule,
    SeriesModule,
    EpisodeModule,
    SeasonModule,
    FfmpegModule,
    AuthModule,
    Mp4boxModule,
    GuidesModule,
    SubtitlesModule,
    MediainfoModule,
  ],
})
export class AppModule {}
