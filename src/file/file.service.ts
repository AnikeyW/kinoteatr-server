import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as uuid from 'uuid';
import * as mime from 'mime-types';

export enum FileTypes {
  VIDEO = 'video',
  IMAGE = 'image',
}

@Injectable()
export class FileService {
  async createFile(type: FileTypes, file) {
    try {
      const fileExtension = mime.extension(file.mimetype);
      const fileName = uuid.v4() + '.' + fileExtension;
      const filePath = path.resolve(__dirname, '..', '..', 'static', type);

      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }

      await fs.promises.writeFile(path.resolve(filePath, fileName), file.buffer);

      return type + '/' + fileName;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  removeFile(fileName: string) {
    try {
      const filePath = path.resolve(__dirname, '..', '..', 'static', fileName);
      fs.unlinkSync(filePath);
      console.log(`File ${fileName} has been deleted.`);
      return fileName;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  moveFileToStatic(pathFrom: string, pathTo: string): string {
    try {
      const fileName = path.basename(pathFrom);

      if (!fs.existsSync(pathTo)) {
        fs.mkdirSync(pathTo, { recursive: true });
      }

      fs.renameSync(pathFrom, path.join(pathTo, fileName));

      return path.relative(path.join(__dirname, '..', '..', 'static'), path.join(pathTo, fileName));
    } catch (error) {
      throw new HttpException('Ошибка перемещения видео', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
