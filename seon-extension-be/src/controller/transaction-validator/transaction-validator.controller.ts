import { Body, Controller, Post, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeoFraudDetectorService } from 'src/service/geo.fraud.detector.service';
import { GeoUpdateService } from 'src/service/geo.update.service';
import { ValidateTransactionRequestDto } from './dto/validate.transaction.request.dto';
import { ValidateTransactionResponse } from './dto/validate.transaction.response.dto';
import { TransactionService } from "../../service/transaction.service";

@Controller()
export class TransactionValidatorController {
    constructor(
        private geoFraudDetectorService: GeoFraudDetectorService,
        private geoUpdateService: GeoUpdateService,
        private transactionService: TransactionService
    ){}
    @Post("geo-check")
    async validate(@Body() body: ValidateTransactionRequestDto) : Promise<ValidateTransactionResponse>{
        let fraudScore = await this.geoFraudDetectorService.detect(body);
        await this.geoUpdateService.report({
            userId: body.userId,
            lat: body.lat,
            long: body.long,
            timestamp: (new Date()).toISOString(), 
            type: "fine"
        });
        await this.transactionService.add(body);
        return {
            "fraud_score": fraudScore
        };
    }
}
