import { Injectable } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs';
import { ExtractedSubtitlesWithCreatedName } from '../subtitles/extractedSubtitlesType';
import { IAudioInfoTrack } from './types';
import { IVideoInfo } from '../mediainfo/mediainfo.service';
import { GuidesService } from '../guides/guides.service';

const execPromise = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class FfmpegService {
  constructor(private guidesService: GuidesService) {}
  async toHlsUsingVideoCard(
    videoTmpPath: string,
    episodeName: string,
    videoInfo: IVideoInfo,
  ): Promise<string> {
    const aspectRatio = (videoInfo.resolution.width / videoInfo.resolution.height).toFixed(2);

    const resolutions_16_9 = [
      '426x240', // 240p
      '640x360', // 360p
      '854x480', // 480p
      '1280x720', // 720p
      '1920x1080', // 1080p
      '2560x1440', // 1440p (2K)
      '3840x2160', // 2160p (4K)
      '7680x4320', // 4320p (8K)
    ];

    const resolutions_2_1 = [
      '426x213',
      '640x320',
      '854x427',
      '1280x640',
      '1920x960',
      '2560x1280',
      '3840x1920',
      '7680x3840',
    ];

    const resolutionsByAspectRatio = {
      '1.78': resolutions_16_9,
      '1.77': resolutions_16_9,
      '2.00': resolutions_2_1,
    };

    const resolutions = resolutionsByAspectRatio[aspectRatio].filter(
      (r) => Number(r.split('x')[0]) <= videoInfo.resolution.width,
    );

    const qualityNamesByWidth = {
      426: '240p',
      640: '360p',
      854: '480p',
      1280: '720p',
      1920: '1080p',
      2560: '1440p',
      3840: '2160p',
      7680: '4320p',
    };

    const bandWidthsByWidth = {
      426: 200,
      640: 400,
      854: 550,
      1280: 1500,
      1920: 4000,
      2560: 5000,
      3840: 6000,
      7680: 8000,
    };

    const folderVideoPathWindow = path.join(__dirname, '..', '..', 'static', 'video', episodeName);
    const folderVideoPath = folderVideoPathWindow.replace(/\\/g, '/');

    try {
      await mkdirAsync(folderVideoPath, { recursive: true });

      const audioTracks = videoInfo.audioTracks;

      let videoMaps: string[] = [];
      let audioMaps: string[] = [];
      let varStreamMap = '';
      for (let i = 0; i < resolutions.length; i++) {
        const width = Number(resolutions[i].split('x')[0]);
        videoMaps.push('-map');
        videoMaps.push('0:v:0');
        videoMaps.push(`-s:v:${i}`);
        videoMaps.push(`${resolutions[i]}`);
        videoMaps.push(`-b:v:${i}`);
        videoMaps.push(`${bandWidthsByWidth[width]}k`);
        varStreamMap += `v:${i},name:${qualityNamesByWidth[width]},agroup:audio `;
      }
      for (let i = 0; i < audioTracks.length; i++) {
        audioMaps.push('-map');
        audioMaps.push(`0:a:${i}`);
        audioMaps.push(`-c:a`);
        audioMaps.push(`aac`);
        audioMaps.push(`-ac`);
        audioMaps.push(`2`);
        audioMaps.push(`-b:a`);
        audioMaps.push(audioTracks[i].bitrate);
        varStreamMap += `a:${i},name:audio_${i},agroup:audio,language:${audioTracks[i].language}${audioTracks[i]?.default?.toUpperCase() === 'YES' ? ',default:yes' : ''} `;
      }

      const hlsCommand = [
        'ffmpeg',
        '-y',
        '-hwaccel',
        'cuda',
        '-i',
        videoTmpPath,
        '-preset',
        'slow',
        '-g',
        '48',
        '-sc_threshold',
        '0',
        ...videoMaps,
        '-c:v',
        'h264_nvenc',
        ...audioMaps,
        '-var_stream_map',
        `"${varStreamMap.trim()}"`,
        '-f',
        'hls',
        '-hls_time',
        '10',
        '-hls_playlist_type',
        'vod',
        '-hls_list_size',
        '0',
        '-hls_segment_filename',
        `"${path.join(folderVideoPath, '%v', 'segmentNo%d.mp4')}"`,
        '-master_pl_name',
        'master.m3u8',
        `${path.join(folderVideoPath, '%v', 'index.m3u8')}`,
      ];

      const command = hlsCommand.join(' ');

      console.log('command', command);

      await new Promise<string>((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 1024 * 5 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Ошибка выполнения команды: ${error}`);
            reject(error);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          resolve(stdout);
        });
      });

      console.log('HLS generation completed successfully');

      this.editMasterManifest(audioTracks, path.join(folderVideoPath, 'master.m3u8'));

      return path.join('video', episodeName, 'master.m3u8');
    } catch (error) {
      console.error(`Error in toHlsUsingVideoCard: ${error.message}`);
      throw error;
    }
  }

  editMasterManifest(audioTracks: IAudioInfoTrack[], existManifestPath: string) {
    try {
      let masterManifest = fs.readFileSync(existManifestPath, 'utf8');

      masterManifest = masterManifest.replace(/\\/g, '/');

      audioTracks.forEach((track) => {
        const uriRegex = new RegExp(`(.*URI="audio_${track.index}/index.m3u8".*)`, 'g');

        masterManifest = masterManifest.replace(uriRegex, (match) => {
          const nameRegex = new RegExp(`NAME="[^"]+"`);
          return match.replace(nameRegex, `NAME="${track.title}"`);
        });
      });

      fs.writeFileSync(existManifestPath, masterManifest, 'utf8');

      console.log('Манифест успешно обновлен.');
    } catch (error) {
      console.error('Ошибка при обновлении манифеста:', error);
    }
  }

  async extractThumbnails(
    videoTmpPath: string,
    videoDuration: number,
    episodeName: string,
  ): Promise<string[]> {
    const THUMB_QUANTITY = 20;

    function secondsToHms(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(secs).padStart(2, '0');

      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }

    // Путь к папке для миниатюр относительно текущего модуля
    const folderThumbnailsPath = path.join(
      __dirname,
      '..',
      '..',
      'static',
      'thumbnails',
      episodeName,
    );

    try {
      // Создание директории для миниатюр
      await mkdirAsync(folderThumbnailsPath, { recursive: true });
      console.log(`Directory created: ${folderThumbnailsPath}`);

      const thumbnailPromises = [];

      for (let i = 1; i <= THUMB_QUANTITY; i++) {
        const step = Math.floor(videoDuration / (THUMB_QUANTITY + 1));
        const time = secondsToHms(step * i);
        console.log(`Creating thumbnail for time: ${time}`);

        const command = `ffmpeg -ss ${secondsToHms(step * i)} -i ${videoTmpPath} -frames:v 1 -vf "scale=1080:-1" ${folderThumbnailsPath}/thumbnail_${i}.webp`;

        thumbnailPromises.push(execPromise(command, { maxBuffer: 1024 * 1024 * 1024 * 5 }));
      }

      await Promise.all(thumbnailPromises);

      const thumbnails = [];
      for (let i = 1; i <= THUMB_QUANTITY; i++) {
        thumbnails.push(path.join('thumbnails', episodeName, `thumbnail_${i}.webp`));
      }

      console.log('Thumbnails created successfully');
      return thumbnails;
    } catch (error) {
      console.error(`Error creating thumbnails: ${error}`);
      throw new Error(`Error creating thumbnails: ${error.message}`);
    }
  }

  async extractSubtitles(
    videoTmpPath: string,
    episodeName: string,
    videoInfo: IVideoInfo,
  ): Promise<ExtractedSubtitlesWithCreatedName[]> {
    try {
      const removeBrackets = (str) => str.replace(/[\[\]]/g, '');

      const subtitlesInfo = videoInfo.subtitlesInfo.map((subtitle) => {
        const language = subtitle.language || 'und';
        const title = subtitle.title
          ? removeBrackets(subtitle.title)
          : this.guidesService.getLanguageNameByLangCode(language);

        return {
          ...subtitle,
          createdName: `(${language})_${title}`,
        };
      });

      const subsExtByCodec = {
        subrip: 'srt',
        ass: 'ass',
        mov_text: 'srt',
      };

      const folderSubtitlesPath = path.join(
        __dirname,
        '..',
        '..',
        'static',
        'subtitles',
        episodeName,
      );

      // Создание директории для субтитров
      try {
        await mkdirAsync(folderSubtitlesPath, { recursive: true });
        console.log(`Directory created: ${folderSubtitlesPath}`);
      } catch (error) {
        console.error(`Error creating directory: ${error}`);
        throw new Error(`Error creating directory: ${error.message}`);
      }

      const extractSubtitles = (subtitle, subFileName) => {
        return new Promise<void>((resolve, reject) => {
          const extractSubsCommand = [
            '-i',
            videoTmpPath,
            '-map',
            `0:${subtitle.index}?`,
            '-c:s',
            subsExtByCodec[subtitle.codec],
            path.join(folderSubtitlesPath, subFileName),
          ];

          const extractProcess = spawn('ffmpeg', extractSubsCommand);

          let stderr = '';

          extractProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          extractProcess.on('close', (code) => {
            if (code !== 0) {
              console.error(`ffmpeg extract stderr: ${stderr}`);
              reject(new Error(`ffmpeg extract exited with code ${code}`));
            } else {
              resolve();
            }
          });
        });
      };

      const convertSubtitles = (subFileName, vttFileName) => {
        return new Promise<void>((resolve, reject) => {
          const convertSubsCommand = [
            '-i',
            path.join(folderSubtitlesPath, subFileName),
            path.join(folderSubtitlesPath, vttFileName),
          ];

          const convertProcess = spawn('ffmpeg', convertSubsCommand);

          let stderr = '';

          convertProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          convertProcess.on('close', (code) => {
            if (code !== 0) {
              console.error(`ffmpeg convert stderr: ${stderr}`);
              reject(new Error(`ffmpeg convert exited with code ${code}`));
            } else {
              resolve();
            }
          });
        });
      };

      const processSubtitles = async () => {
        const promises = subtitlesInfo.map(async (subtitle) => {
          const subExt = subsExtByCodec[subtitle.codec];
          const subFileName = `${subtitle.createdName}.${subExt}`;
          const vttFileName = `${subtitle.createdName}.vtt`;

          await extractSubtitles(subtitle, subFileName);
          await convertSubtitles(subFileName, vttFileName);

          // Удаление исходного файла субтитров после конвертации
          try {
            await unlinkAsync(path.join(folderSubtitlesPath, subFileName));
            console.log(`Deleted original subtitle file: ${subFileName}`);
          } catch (error) {
            console.error(`Error deleting original subtitle file: ${error}`);
          }
        });

        await Promise.all(promises);
      };

      await processSubtitles();

      console.log('Subtitles extracted and converted successfully');

      return subtitlesInfo;
    } catch (error) {
      console.error(`Failed to process subtitles: ${error.message}`);
      throw new Error(`Failed to process subtitles: ${error.message}`);
    }
  }
}
