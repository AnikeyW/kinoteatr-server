export interface IExtractedSubtitles {
  index: number;
  codec_name: 'subrip' | 'ass';
  codec_type: string;
  tags: {
    language: string;
    title?: string;
  };
}

export type ExtractedSubtitlesWithCreatedName = IExtractedSubtitles & {
  createdName: string;
};
