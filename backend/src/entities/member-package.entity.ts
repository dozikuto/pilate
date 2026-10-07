import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Package } from './package.entity';
import { Transaction } from './transaction.entity';

export enum MemberPackageStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('member_packages')
export class MemberPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'package_id' })
  packageId: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'remaining_sessions', nullable: true })
  remainingSessions: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'enum', enum: MemberPackageStatus, default: MemberPackageStatus.ACTIVE })
  status: MemberPackageStatus;

  @ManyToOne(() => Member, (member) => member.memberPackages)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Package)
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
