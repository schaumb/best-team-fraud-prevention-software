import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GeoEntryEntity } from "src/database/entitiy/geo.entry.entity";
import { Repository } from "typeorm";
import * as axios from "axios";
import { GeoUpdateService } from "./geo.update.service";

export type TransactionModel = {
  userId: string;
  cardNumber: string;
  ip: string;
  lat: number;
  long: number;
};
const GeoUtil = {
  distance: (start: { lat: number, long: number }, end: { lat: number, long: number }): number => {
    const R = 6371e3;
    const fi1 = start.lat * Math.PI / 180;
    const fi2 = end.lat * Math.PI / 180;
    const deltaFi = (end.lat - start.lat) * Math.PI / 180;
    const deltaLambda = (end.long - start.long) * Math.PI / 180;
    const a = Math.sin(deltaFi / 2) * Math.sin(deltaFi / 2) +
      Math.cos(fi1) * Math.cos(fi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
  speed: (distanceMeter: number, millis: number): number => {
    return distanceMeter / (millis / 1000);
  }
};

const TimeUtil = {
  duration: (start: any, end: any) => {
    let toTimeStamp = (date: any): number => {
      let ts = null;
      if (start instanceof Date) {
        ts = start.getTime();
      } else {
        ts = Date.parse(start);
      }
      return ts;
    };

    return toTimeStamp(end) - toTimeStamp(start);
  }
};

@Injectable()
export class GeoFraudDetectorService {
  constructor(
    @InjectRepository(GeoEntryEntity) private geoEntryEntity: Repository<GeoEntryEntity>
  ) {
  }

  private rules: { [key: string]: (history: Array<GeoEntryEntity>, transaction: TransactionModel) => Promise<number> } = {
    CLOAK_FORMULA: async (history, transaction) => {
      if (history.length == 0) {
        return 0;
      }

      let speeds = [];
      for (let i = 1; i < history.length; i++) {
        let prev = history[i - 1];
        let current = history[i];
        let distance = GeoUtil.distance(prev, current);
        let time = TimeUtil.duration(prev.timestamp, current.timestamp);
        speeds.push(GeoUtil.speed(distance, time));
      }
      let lastHistoryEntry = history[history.length - 1];
      let transactionDistance = GeoUtil.distance(lastHistoryEntry, transaction);
      let transactionTimeDiff = TimeUtil.duration(lastHistoryEntry.timestamp, new Date());
      speeds.push(GeoUtil.speed(transactionDistance, transactionTimeDiff));
      let isFasterThanLight = speeds.some(speed => speed > 299_792_458);
      let isFasterThanSound = speeds.some(speed => speed > 343);
      if (isFasterThanLight) {
        return 99;
      } else if (isFasterThanSound) {
        return 10;
      } else {
        return 0;
      }
    },
    SUS_COUNTRIES: async (history, transaction) => {
      const blacklistedCountries = [
        "Russia",
        "India"
      ];
      let response = await axios.default.get(`https://api.opencagedata.com/geocode/v1/json?key=7590be68ca1b4a9bbfbd3643a15d3af4&pretty=1&no_annotations=1&q=${transaction.lat},${transaction.long}`, {});
      if (response.data.results.some(result => blacklistedCountries.includes(result.components.country))) {
        return 98;
      } else {
        return 0;
      }
    },
    LARGE_TRANSACTION_GEO_LOCATION_DEVIATION: async (history, transaction) => {
      let groups = [];
      for(let historyItem of history){
        let closestGroup = (() => {

          return null;
        })();
      }
      return 0;
    },
    IP_GEO_REAL_GEO_DISTANCE_TOO_LARGE: async (history, transaction) => {
      if (history.length == 0) {
        return 0;
      }

      let response = await axios.default.get(`http://ip-api.com/json/${transaction.ip}`);
      console.log(response.data);
      if (response.data.status == "fail" || !response.data.lat || !response.data.lon) {
        return 0;
      }
      let lastHistoryItem = history[history.length - 1];
      console.log(TimeUtil.duration(lastHistoryItem.timestamp, new Date()));
      if (TimeUtil.duration(lastHistoryItem.timestamp, new Date()) >= 1000 * 60 * 60 * 24) {
        //Too old time util
        return 0;
      }
      if (Math.abs(GeoUtil.distance(lastHistoryItem, {
        lat: response.data.lat,
        long: response.data.lon
      })) > 1_000_000) {
        return 96;
      } else {
        return 0;
      }
    },
    ONE_IP_MULTIPLE_SHIPPING_ADDRESS: async (history, transaction) => {
      return 0;
    }
  };

  async detect(transaction: TransactionModel): Promise<number> {
    let history = await this.geoEntryEntity.find({
      where: {
        userId: transaction.userId
      },
      order: {
        timestamp: "ASC"
      }
    });

    let rulesResult = await Promise.all(
      Object.keys(this.rules).map(key => {
        let rule = this.rules[key];
        return rule(history, transaction)
          .then(result => {
            return [key, result, null];
          })
          .catch(error => {
            return [key, -1, error];
          });
      })
    );
    console.table(rulesResult);
    return Math.min(100, Math.max(...rulesResult.map(res => res[1])));
  }
}
