export class CreateSeriesDto {
  readonly title: string;
  readonly description: string;
  readonly releaseYear: string;
  readonly rateKinopoisk: string;
  readonly rateImdb: string;
  readonly quality: string;
  readonly countries: string; // json строка массив строк
  readonly genres: string; // json строка массив строк
}
