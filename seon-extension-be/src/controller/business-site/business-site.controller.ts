import { Body, Controller, Get, Header, Post, StreamableFile } from "@nestjs/common";
import { GeoFraudDetectorService, TransactionModel } from "../../service/geo.fraud.detector.service";

@Controller()
export class BusinessSiteController {
  constructor(
    private geoService: GeoFraudDetectorService
  ) {
  }
  @Post("/test-case")
  async handlePostEvents(@Body() form: any){
    let currentRequest = form[0];
    let geoLocationHistory = form[1];
    let transactionHistory = form[2];

    return {
      "fraud_score": await this.geoService.detect(currentRequest, geoLocationHistory, transactionHistory)
    }

  }
}
