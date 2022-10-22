import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GeoEntryEntity } from "src/database/entitiy/geo.entry.entity";
import { Repository } from "typeorm";

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
    ) { }
    private rules: { [key: string]: (history: Array<GeoEntryEntity>, transaction: TransactionModel) => number } = {
        CLOAK_FORMULA: (history, transaction) => {
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
        SUS_COUNTRIES: (history, transaction) => {
            
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
        let rulesResult = Object.keys(this.rules).map(key => {
            let rule = this.rules[key];
            return rule(history, transaction);
        });

        return Math.min(100, Math.max(...rulesResult))
    }
}
