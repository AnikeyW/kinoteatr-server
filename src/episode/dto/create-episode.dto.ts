export class CreateEpisodeDto {
  readonly title: string;
  readonly description: string;
  readonly order: string;
  readonly skipRepeat?: string;
  readonly skipIntro?: string;
  readonly skipCredits?: string;
  readonly seasonId: string;
  readonly releaseDate: string;
}
