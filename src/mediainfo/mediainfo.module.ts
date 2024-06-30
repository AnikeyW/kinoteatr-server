import { Module } from '@nestjs/common';
import { MediainfoService } from './mediainfo.service';

@Module({
  providers: [MediainfoService]
})
export class MediainfoModule {}
