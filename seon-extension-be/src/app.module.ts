import * as path from "path";
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoUpdateReceiverController } from './controller/geo-update-receiver/geo-update-receiver.controller';
import { TransactionValidatorController } from './controller/transaction-validator/transaction-validator.controller';
import { GeoEntryEntity } from './database/entitiy/geo.entry.entity';
import { GeoFraudDetectorService } from "./service/geo.fraud.detector.service";
import { GeoUpdateService } from "./service/geo.update.service";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: path.join(process.cwd(), "database", "database.sqlite"),
      synchronize: true,
      entities: [GeoEntryEntity]
    }),
    TypeOrmModule.forFeature([
      GeoEntryEntity 
    ])
  ],
  controllers: [
    GeoUpdateReceiverController, 
    TransactionValidatorController
  ],
  providers: [
    GeoFraudDetectorService,
    GeoUpdateService
  ],
})
export class AppModule {}
