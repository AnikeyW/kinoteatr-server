import { Injectable } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
      const bandWidths = {
        240: 200,
        360: 400,
        480: 550,
        720: 1500,
        1080: 4000,
        1440: 8000,
        2160: 16000,
        4320: 32000,
      };

      let mapsCommand = '';
      let resBtCommand = '';
      let varStreamMapCommand = '';
      for (let i = 0; i < resolutions.length; i++) {
        mapsCommand += '-map 0:0 -map 0:1 ';

        const res = resolutions[i].replace('x', '*');
        const height = Number(res.split('*')[1]);
        resBtCommand += `-s:v:${i} ${res} -b:v:${i} ${bandWidths[height]}k `;

        varStreamMapCommand += `v:${i},a:${i},name:${height}p `;
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
    thumbQuantity: number,
    episodeName: string,
  ) {
    return new Promise((resolve, reject) => {
      function secondsToHms(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(secs).padStart(2, '0');

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      }

      const folderThumbnailsPath = path.join(
        __dirname,
        '..',
        '..',
        'static',
        'thumbnails',
        episodeName,
      );

      const thumbnailPromises = [];

      for (let i = 1; i <= thumbQuantity; i++) {
        const step = Math.floor(videoDuration / (thumbQuantity + 1));
        console.log(secondsToHms(step * i));

        const command = `ffmpeg -ss ${secondsToHms(step * i)} -i ${videoTmpPath} -frames:v 1 -vf "scale=1080:-1" ${folderThumbnailsPath}/thumbnail_${i}.webp`;
        // const command = `ffmpeg -ss ${secondsToHms(step * i)} -i ${videoTmpPath} -frames:v 1 -vf "scale='if(gt(a,16/9),1080,-1)':'if(gt(a,16/9),-1,1080)',pad=1080:1080:(ow-iw)/2:(oh-ih)/2" ${folderThumbnailsPath}/thumbnail_${i}.webp`;
        // const command = `ffmpeg -ss ${secondsToHms(step * i)} -i ${videoTmpPath} -frames:v 1 -vf "scale='if(gte(iw/ih,16/9),1080,-1)':'if(gte(iw/ih,16/9),-1,1080)',pad=1080:1080:(1080-iw)/2:(1080-ih)/2" ${folderThumbnailsPath}/thumbnail_${i}.webp`;

        thumbnailPromises.push(execPromise(command, { maxBuffer: 1024 * 1024 * 1024 * 5 }));
      }

      const funcPromises = async () => {
        await Promise.all(thumbnailPromises);
        console.log('Thumbnails created successfully');
        resolve('ok');
      };

      try {
        funcPromises();
      } catch (error) {
        console.error(`Error creating thumbnails: ${error}`);
        reject(error);
      }
    });
  }
}
