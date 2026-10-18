import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Package } from './package.entity';
import { PrivateSessionType } from '../common/enums/private-session-type.enum';
export { PrivateSessionType } from '../common/enums/private-session-type.enum';

export enum PrivateSessionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('private_session_requests')
export class PrivateSessionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_user_id' })
  memberUserId: string;

  @Column({ name: 'instructor_user_id' })
  instructorUserId: string;

  @Column({ name: 'package_id', nullable: true })
  packageId: string;

  @ManyToOne(() => Package, { nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({
    name: 'session_type',
    type: 'enum',
    enum: PrivateSessionType,
    default: PrivateSessionType.PRIVATE_1V1,
  })
  sessionType: PrivateSessionType;

  @Column({ type: 'enum', enum: PrivateSessionStatus, default: PrivateSessionStatus.PENDING })
  status: PrivateSessionStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'response_note', type: 'text', nullable: true })
  responseNote: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'member_user_id' })
  memberUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'instructor_user_id' })
  instructorUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
