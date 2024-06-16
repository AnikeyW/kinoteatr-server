import { Controller, Get } from '@nestjs/common';
import { GuidesService } from './guides.service';

@Controller('guides')
export class GuidesController {
  constructor(private guidesService: GuidesService) {}

  @Get('countries')
  getCountries() {
    return this.guidesService.getCountries();
  }

  @Get('genres')
  getGenres() {
    return this.guidesService.getGenres();
  }
}
