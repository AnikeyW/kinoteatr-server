import { Injectable } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

// const execAsync = promisify(exec);

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

  async toHls(videoTmpPath: string, episodeName: string, resolutions: string[]) {
    return new Promise((resolve, reject) => {
      const bandWidths = {
        240: 200,
        360: 400,
        480: 550,
        720: 1500,
        1080: 3000,
        1440: 6000,
        2160: 12000,
        4320: 25000,
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

      const command = `ffmpeg -y -i ${videoTmpPath} -preset slow -g 48 -sc_threshold 0 ${mapsCommand}${resBtCommand}-c:a aac -var_stream_map "${varStreamMapCommand.trim()}" -master_pl_name master.m3u8 -f hls -hls_time 10 -hls_playlist_type vod -hls_list_size 0 -hls_segment_filename "${folderVideoPath}/%v/segmentNo%d.ts" ${folderVideoPath}/%v/index.m3u8`;

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
}
