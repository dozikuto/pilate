import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { PackageType } from '../common/enums/package-type.enum';
import { PrivateSessionType } from '../common/enums/private-session-type.enum';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column()
  name: string;

  @Column({ name: 'catalog_code', type: 'varchar', nullable: true, unique: true })
  catalogCode: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PackageType, default: PackageType.SESSION_BASED })
  type: PackageType;

  @Column({ name: 'total_sessions', nullable: true })
  totalSessions: number;

  @Column({ name: 'duration_days', nullable: true })
  durationDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'is_transferable', default: false })
  isTransferable: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'private_session_enabled', default: false })
  privateSessionEnabled: boolean;

  @Column({ name: 'private_session_type', type: 'enum', enum: PrivateSessionType, default: PrivateSessionType.PRIVATE_1V1 })
  privateSessionType: PrivateSessionType;

  @Column({ name: 'private_session_duration_minutes', default: 60 })
  privateSessionDurationMinutes: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
