import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, Table } from "typeorm";

@Entity()
export class GeoEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  userId: string;
  @Column()
  lat: number;
  @Column()
  long: number;
  @Column()
  timestamp: string;
}
