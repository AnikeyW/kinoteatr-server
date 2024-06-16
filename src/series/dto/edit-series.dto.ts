export class EditSeriesDto {
  readonly title: string;
  readonly description: string;
  readonly releaseYear: string;
  readonly poster?: string;
  readonly rateKinopoisk: string;
  readonly rateImdb: string;
  readonly quality: string;
  readonly countries: string; // json строка массив строк
  readonly genres: string; // json строка массив строк
}
