export interface IExistSubtitles {
  id: number;
  src: string;
  episodeId: string;
}

export class EditEpisodeDto {
  readonly title: string;
  readonly description: string;
  readonly order: string;
  readonly poster: string;
  readonly skipRepeat?: string;
  readonly skipIntro?: string;
  readonly skipCredits?: string;
  readonly releaseDate: string;
  readonly existSubtitles: string;
}
