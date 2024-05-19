import { Module } from '@nestjs/common';
import { Mp4boxService } from './mp4box.service';

@Module({
  providers: [Mp4boxService]
})
export class Mp4boxModule {}
