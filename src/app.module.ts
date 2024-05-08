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
import * as process from 'process';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
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
  ],
})
export class AppModule {}
