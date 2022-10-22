import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeoEntryEntity } from 'src/database/entitiy/geo.entry.entity';
import { GeoUpdateService } from 'src/service/geo.update.service';
import { Repository } from 'typeorm';
import { UpdateLocationRequestDTO } from './dto/update.location.request.dto';

@Controller()
export class GeoUpdateReceiverController {
    constructor(
        private geoUpdateService: GeoUpdateService
    ){}

    @HttpCode(204)
    @Post("update-location")
    async updateLocation(@Body() req: UpdateLocationRequestDTO){
        await this.geoUpdateService.report(req);
    }
}
