export class CreateEpisodeDto {
  readonly title: string;
  readonly description: string;
  readonly order: string;
  readonly skipRepeat?: string;
  readonly skipRepeatEnd?: string;
  readonly skipIntro?: string;
  readonly skipIntroEnd?: string;
  readonly skipCredits?: string;
  readonly seasonId: string;
  readonly releaseDate: string;
}
