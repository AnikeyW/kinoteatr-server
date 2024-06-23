import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractedSubtitlesWithCreatedName } from './extractedSubtitlesType';
import * as path from 'path';

@Injectable()
export class SubtitlesService {
  constructor(private prismaService: PrismaService) {}

  async saveSubtitles(
    subtitlesList: ExtractedSubtitlesWithCreatedName[],
    episodeId: number,
    episodeName: string,
  ) {
    for (const subtitle of subtitlesList) {
      const subPathFromStatic = path.join('subtitles', episodeName, `${subtitle.createdName}.vtt`);
      await this.prismaService.subtitles.create({
        data: { src: subPathFromStatic, episodeId },
      });
    }
  }
}
