import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Member } from './member.entity';
import { ClassSchedule } from './class-schedule.entity';
import { User } from './user.entity';
import { MemberPackage } from './member-package.entity';

export enum CheckInMethod {
  QR = 'qr',
  MANUAL = 'manual',
  FACE_ID = 'face_id',
}

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId: string;

  @Column({ name: 'member_package_id', type: 'uuid', nullable: true })
  memberPackageId: string | null;

  @ManyToOne(() => MemberPackage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_package_id' })
  memberPackage: MemberPackage;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string;

  @Column({ name: 'check_in_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  checkInTime: Date;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime: Date;

  @Column({ type: 'enum', enum: CheckInMethod, default: CheckInMethod.MANUAL })
  method: CheckInMethod;

  @Column({ name: 'processed_by', nullable: true })
  processedById: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Member, (member) => member.checkIns)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => ClassSchedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ClassSchedule;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
