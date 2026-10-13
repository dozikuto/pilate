import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PrivateSessionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PrivateSessionType {
  PRIVATE_1V1 = 'private_1v1',
  SEMI_PRIVATE_1V2 = 'semi_private_1v2',
  SMALL_GROUP_1V3 = 'small_group_1v3',
  SMALL_GROUP_1V4 = 'small_group_1v4',
}

@Entity('private_session_requests')
export class PrivateSessionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_user_id' })
  memberUserId: string;

  @Column({ name: 'instructor_user_id' })
  instructorUserId: string;

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
