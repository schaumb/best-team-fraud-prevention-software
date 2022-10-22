import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TransactionEntryEntity{
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  userId: string;
  @Column()
  cardNumber: string;
  @Column()
  ip: string;
  @Column()
  lat: number;
  @Column()
  long: number;

  @Column()
  billingZipCode: number;
  @Column()
  billingCountry: string;
  @Column()
  billingCity: string;
  @Column()
  billingStreet: string;

  @Column()
  shippingZipCode: number;
  @Column()
  shippingCountry: string;
  @Column()
  shippingCity: string;
  @Column()
  shippingStreet: string;
}
