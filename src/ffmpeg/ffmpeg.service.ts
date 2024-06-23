import { Injectable } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs';
import {
  ExtractedSubtitlesWithCreatedName,
  IExtractedSubtitles,
} from '../subtitles/extractedSubtitlesType';

const execPromise = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class FfmpegService {
  async getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);

      let duration = '';

      ffprobe.stdout.on('data', (data) => {
        duration += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(`ffprobe exited with code ${code}`);
          return;
        }

        resolve(Math.round(parseFloat(duration)));
      });
    });
  }

  async getVideoResolution(filePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);

      let resolution = '';

      ffprobe.stdout.on('data', (data) => {
        resolution += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(`ffprobe exited with code ${code}`);
          return;
        }

        const [width, height] = resolution.trim().split('\n');
        resolve({ width: parseInt(width), height: parseInt(height) });
      });
    });
  }

  async toHlsUsingVideoCard(videoTmpPath: string, episodeName: string, resolutions: string[]) {
    //mp4 segments
    return new Promise((resolve, reject) => {
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
        2560: 8000,
        3840: 16000,
        7680: 32000,
      };

      let mapsCommand = '';
      let resBtCommand = '';
      let varStreamMapCommand = '';
      for (let i = 0; i < resolutions.length; i++) {
        mapsCommand += '-map 0:0 -map 0:1 ';

        const res = resolutions[i].replace('x', '*');
        const width = Number(res.split('*')[0]);
        resBtCommand += `-s:v:${i} ${res} -b:v:${i} ${bandWidthsByWidth[width]}k `;

        varStreamMapCommand += `v:${i},a:${i},name:${qualityNamesByWidth[width]} `;
      }

      const folderVideoPath = path.join(__dirname, '..', '..', 'static', 'video', episodeName);

      const command = `ffmpeg -y -hwaccel cuda -i ${videoTmpPath} -preset slow -g 48 -sc_threshold 0 ${mapsCommand}${resBtCommand}-c:v h264_nvenc -c:a aac -var_stream_map "${varStreamMapCommand.trim()}" -master_pl_name master.m3u8 -f hls -hls_time 10 -hls_playlist_type vod -hls_list_size 0 -hls_segment_filename "${folderVideoPath}/%v/segmentNo%d.mp4" ${folderVideoPath}/%v/index.m3u8`;

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

        const command = `ffmpeg -ss ${time} -i ${videoTmpPath} -frames:v 1 -vf "scale=1080:-1" ${folderThumbnailsPath}/thumbnail_${i}.webp`;
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
  ): Promise<ExtractedSubtitlesWithCreatedName[]> {
    return new Promise<ExtractedSubtitlesWithCreatedName[]>((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        's',
        '-show_entries',
        'stream=index,codec_type,codec_name:stream_tags=language,title',
        '-of',
        'json',
        videoTmpPath,
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', async (code) => {
        if (code !== 0) {
          reject(`ffprobe exited with code ${code}: ${stderr}`);
          return;
        }

        try {
          const subtitlesInfoFull = JSON.parse(stdout);

          const subtitlesFromFFProbe: IExtractedSubtitles[] = subtitlesInfoFull.streams || [];
          const subtitlesInfo = subtitlesFromFFProbe.map((subtitle, idx) => ({
            ...subtitle,
            index: idx, // Заменяем индекс на индекс, начинающийся с 0
            createdName: `(${subtitle.tags.language})_${subtitle.tags?.title || ''}`,
          }));

          const subsExtByCodec = {
            subrip: 'srt',
            aas: 'aas',
          };

          const folderSubtitlesPath = path.join(
            __dirname,
            '..',
            '..',
            'static',
            'subtitles',
            episodeName,
          );

          try {
            // Создание директории для субтитров
            await mkdirAsync(folderSubtitlesPath, { recursive: true });
            console.log(`Directory created: ${folderSubtitlesPath}`);
          } catch (error) {
            console.error(`Error creating directory: ${error}`);
            reject(`Error creating directory: ${error.message}`);
            return;
          }

          const extractSubtitles = (subtitle, subFileName) => {
            return new Promise<void>((resolve, reject) => {
              const extractSubsCommand = [
                '-i',
                videoTmpPath,
                '-map',
                `0:s:${subtitle.index}`,
                '-c:s',
                'copy',
                path.join(folderSubtitlesPath, subFileName),
              ];

              const extractProcess = spawn('ffmpeg', extractSubsCommand);

              extractProcess.on('close', (code) => {
                if (code !== 0) {
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

              convertProcess.on('close', (code) => {
                if (code !== 0) {
                  reject(new Error(`ffmpeg convert exited with code ${code}`));
                } else {
                  resolve();
                }
              });
            });
          };

          const processSubtitles = async () => {
            const promises = subtitlesInfo.map(async (subtitle) => {
              const subExt = subsExtByCodec[subtitle.codec_name];
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

          resolve(subtitlesInfo);
        } catch (error) {
          reject(`Failed to parse ffprobe output: ${error.message}`);
        }
      });
    });
  }
}
