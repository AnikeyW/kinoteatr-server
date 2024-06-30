// export interface IExtractedSubtitles {
//   index: number;
//   codec_name: 'subrip' | 'ass' | 'mov_text';
//   codec_type: string;
//   tags: {
//     language: string;
//     title?: string;
//   };
// }
//
// export type ExtractedSubtitlesWithCreatedName = IExtractedSubtitles & {
//   createdName: string;
// };
export interface IExtractedSubtitles {
  index: number;
  codec: 'subrip' | 'ass' | 'mov_text';
  language: string;
  title: string | undefined;
}

export type ExtractedSubtitlesWithCreatedName = IExtractedSubtitles & {
  createdName: string;
};
