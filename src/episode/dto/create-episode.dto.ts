export class CreateEpisodeDto {
  readonly title: string;
  readonly description: string;
  readonly voice: string;
  readonly quality: string;
  readonly order: string;
  readonly skipRepeat?: string;
  readonly skipIntro?: string;
  readonly skipCredits?: string;
  readonly seasonId: string;
}
