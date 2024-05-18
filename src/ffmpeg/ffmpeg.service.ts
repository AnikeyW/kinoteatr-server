import { Injectable } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';

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

  async toHlsAndDash(videoTmpPath: string, episodeName: string, resolutions: string[]) {
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

      const com = `ffmpeg -y -hwaccel cuda -i ${videoTmpPath} -preset slow -g 48 -sc_threshold 0 -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 -s:v:0 1280x720 -b:v:0 850k -s:v:1 630x360 -b:v:1 550k -c:v h264_nvenc -c:a aac -var_stream_map "v:0,a:0,name:720p v:1,a:1,name:360p" -master_pl_name master.m3u8 -hls_playlist 1 -f hls -hls_time 10 -hls_playlist_type vod -hls_list_size 0 -hls_segment_filename "${folderVideoPath}/segment_%v_%03d.ts" -f dash -min_seg_duration 2000 -use_template 1 -use_timeline 1 -seg_duration 10 -init_seg_name "${folderVideoPath}/init_$RepresentationID$.mp4" -media_seg_name "${folderVideoPath}/chunk_$RepresentationID$_$Number%05d$.mp4" -adaptation_sets "id=0,streams=v id=1,streams=a" -f dash manifest.mpd`;

      exec(com, { maxBuffer: 1024 * 1024 * 1024 * 5 }, (error, stdout, stderr) => {
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

  async toHlsUsingVideoCard(videoTmpPath: string, episodeName: string, resolutions: string[]) {
    //mp4 segments
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
