import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GeoEntryEntity } from "src/database/entitiy/geo.entry.entity";
import { Repository } from "typeorm";
import * as axios from "axios";
import { GeoUpdateService } from "./geo.update.service";
import { TransactionEntryEntity } from "../database/entitiy/transaction.entry.entity";
import { Address } from "../controller/transaction-validator/dto/validate.transaction.request.dto";

export type TransactionModel = {
  userId: string;
  cardNumber: string;
  ip: string;
  lat: number;
  long: number;
  billingAddress: Address,
  shippingAddress: Address
};

type GeoCoordinate = {
  lat: number;
  long: number;
};
const GeoUtil = {
  distance: (start: GeoCoordinate, end: GeoCoordinate): number => {
    const R = 6371e3;
    const fi1 = start.lat * Math.PI / 180;
    const fi2 = end.lat * Math.PI / 180;
    const deltaFi = (end.lat - start.lat) * Math.PI / 180;
    const deltaLambda = (end.long - start.long) * Math.PI / 180;
    const a = Math.sin(deltaFi / 2) * Math.sin(deltaFi / 2) +
      Math.cos(fi1) * Math.cos(fi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.abs(R * c);
  },
  midPoint(start: GeoCoordinate, end: GeoCoordinate): GeoCoordinate {
    //TOOD: GMP Adjust
    return {
      lat: (start.lat + end.lat) / 2,
      long: (start.long + end.long) / 2
    };
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
      return Math.abs(ts);
    };

    return toTimeStamp(end) - toTimeStamp(start);
  }
};

@Injectable()
export class GeoFraudDetectorService {
  constructor(
    @InjectRepository(GeoEntryEntity) private geoEntryEntity: Repository<GeoEntryEntity>,
    @InjectRepository(TransactionEntryEntity) private transactionEntryEntityRepository: Repository<TransactionEntryEntity>
  ) {
  }

  private rules: { [key: string]: (history: Array<GeoEntryEntity>, transaction: TransactionModel, previousTransactions: Array<TransactionEntryEntity>) => Promise<number> } = {
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
      let groups: Array<{ lat: number, long: number }> = [];
      const GROUP_TRESHOLD = 3_000;
      const GROUP_FORGIVE_COUNT = 20
      for (let historyItem of history) {
        let closestGroupIndex = (() => {
          let targetIndex = groups.findIndex(group => GeoUtil.distance(group, historyItem) < GROUP_TRESHOLD);
          return targetIndex;
        })();
        if (closestGroupIndex < 0) {
          groups.push(historyItem);
        } else {
          let targetGroup = groups[closestGroupIndex]
          groups[closestGroupIndex] = GeoUtil.midPoint(targetGroup, historyItem)
        }
      }

      if(!groups.some(group => GeoUtil.distance(group, transaction) < GROUP_TRESHOLD) && groups.length < GROUP_FORGIVE_COUNT){
        return 10;
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
    ONE_IP_MULTIPLE_SHIPPING_ADDRESS: async (history, transaction, previousTransactions) => {
      let prevTransactionsFromTheSameIp = previousTransactions.filter(trans => trans.ip == transaction.ip);
      const DIFFERENT_ADDRESS_COUNTER_TRIGGER = 10
      let differentAddressCount = prevTransactionsFromTheSameIp.reduce((prev, current) => {
        let pairs = [
          [ current.billingZipCode, transaction.billingAddress.zipCode ],
          [ current.billingCountry, transaction.billingAddress.country ],
          [ current.billingCity, transaction.billingAddress.city ],
          [ current.billingStreet, transaction.billingAddress.street ],
          [ current.shippingZipCode, transaction.shippingAddress.zipCode ],
          [ current.shippingCountry, transaction.shippingAddress.country ],
          [ current.shippingCity, transaction.shippingAddress.city ],
          [ current.shippingStreet, transaction.shippingAddress.street ],
        ];
        if(pairs.some(pair => pair[0] != pair[1])){
          return prev + 1;
        }
        return prev;
      }, 0);

      if(differentAddressCount >= DIFFERENT_ADDRESS_COUNTER_TRIGGER){
        return 10;
      }
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

    let transactions = await this.transactionEntryEntityRepository.find({
      where: {
        userId: transaction.userId
      }
    });

    let rulesResult = await Promise.all(
      Object.keys(this.rules).map(key => {
        let rule = this.rules[key];
        return rule(history, transaction, transactions)
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
