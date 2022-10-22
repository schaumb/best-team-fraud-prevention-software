import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { TransactionEntryEntity } from "../database/entitiy/transaction.entry.entity";
import {
  ValidateTransactionRequestDto
} from "../controller/transaction-validator/dto/validate.transaction.request.dto";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(TransactionEntryEntity) private transactionEntryEntityRepository: Repository<TransactionEntryEntity>
  ) {
  }

  async add(transaction: ValidateTransactionRequestDto) {
    await this.transactionEntryEntityRepository.save(<any>{
      cardNumber: transaction.cardNumber,
      userId: transaction.userId,
      ip: transaction.ip,
      lat: transaction.lat,
      long: transaction.long,

      billingZipCode: transaction.billingAddress.zipCode,
      billingCountry: transaction.billingAddress.country,
      billingCity: transaction.billingAddress.city,
      billingStreet: transaction.billingAddress.street,

      shippingZipCode: transaction.shippingAddress.zipCode,
      shippingCountry: transaction.shippingAddress.country,
      shippingCity: transaction.shippingAddress.city,
      shippingStreet: transaction.shippingAddress.street

    });
  }
}
