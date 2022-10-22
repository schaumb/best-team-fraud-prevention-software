import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GeoEntryEntity } from "src/database/entitiy/geo.entry.entity";
import { Repository } from "typeorm";

export type GeoUpdateModel = {
    userId: string;
    type: "coarse"|"fine";
    lat: number;
    long: number; 
    timestamp: string
};

@Injectable()
export class GeoUpdateService{
    constructor(
        @InjectRepository(GeoEntryEntity) private geoEntryEntityRepository: Repository<GeoEntryEntity>
    ){}

    async report(updateModel: GeoUpdateModel){
        await this.geoEntryEntityRepository.save({
            ...updateModel
        });
    }
}