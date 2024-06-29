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
  readonly skipRepeatEnd?: string;
  readonly skipIntro?: string;
  readonly skipIntroEnd?: string;
  readonly skipCredits?: string;
  readonly releaseDate: string;
  readonly existSubtitles: string;
  readonly width: string;
  readonly height: string;
}
