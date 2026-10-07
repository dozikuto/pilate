import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ClassSchedule } from './class-schedule.entity';
import { Member } from './member.entity';
import { MemberPackage } from './member-package.entity';
import { BookingStatus } from '../common/enums/booking-status.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id' })
  scheduleId: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'member_package_id', nullable: true })
  memberPackageId: string;

  @Column({ name: 'spot_number', nullable: true })
  spotNumber: number;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @Column({ name: 'booked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  bookedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason: string;

  @Column({ name: 'is_late_cancel', default: false })
  isLateCancel: boolean;

  @ManyToOne(() => ClassSchedule, (schedule) => schedule.bookings)
  @JoinColumn({ name: 'schedule_id' })
  schedule: ClassSchedule;

  @ManyToOne(() => Member, (member) => member.bookings)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => MemberPackage, { nullable: true })
  @JoinColumn({ name: 'member_package_id' })
  memberPackage: MemberPackage;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
