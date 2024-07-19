import { Episode, Subtitles } from '@prisma/client';

export interface EpisodeWithSubtitles extends Episode {
  subtitles: Subtitles[];
}
