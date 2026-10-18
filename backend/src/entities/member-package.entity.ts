import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Package } from './package.entity';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

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

  @Column({ name: 'preferred_instructor_id', type: 'uuid', nullable: true })
  preferredInstructorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preferred_instructor_id' })
  preferredInstructor: User;

  @Column({ name: 'duo_partner_package_id', type: 'uuid', nullable: true })
  duoPartnerPackageId: string | null;

  @ManyToOne(() => MemberPackage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'duo_partner_package_id' })
  duoPartnerPackage: MemberPackage;

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
