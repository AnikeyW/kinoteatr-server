import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as path from 'path';

@Injectable()
export class Mp4boxService {
  async toMpdFromHls(
    episodeName: string,
    hlsPathFromStatic: string,
  ): Promise<{ hlsPathFromStatic: string; dashPathFromStatic: string }> {
    return new Promise((resolve, reject) => {
      const m3u8ManifestPath = path.join(__dirname, '..', '..', 'static', hlsPathFromStatic);

      const mpdManifestPath = path.join(
        __dirname,
        '..',
        '..',
        'static',
        'video',
        episodeName,
        'master.mpd',
      );
      const dashPathFromStatic = path.join('video', episodeName, 'master.mpd');

      const command = `MP4Box -mpd ${m3u8ManifestPath} -out ${mpdManifestPath}`;

      exec(command, { maxBuffer: 1024 * 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Ошибка выполнения команды: ${error}`);
          reject(error);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        resolve({ hlsPathFromStatic, dashPathFromStatic });
      });
    });
  }
}
