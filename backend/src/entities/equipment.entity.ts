import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { EquipmentStatus, EquipmentType } from '../common/enums/equipment-status.enum';

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EquipmentType, default: EquipmentType.OTHER })
  type: EquipmentType;

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.AVAILABLE })
  status: EquipmentStatus;

  @Column({ name: 'serial_number', nullable: true })
  serialNumber: string;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ name: 'last_maintenance_date', type: 'date', nullable: true })
  lastMaintenanceDate: Date;

  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
