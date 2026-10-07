import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { User } from './user.entity';
import { Room } from './room.entity';
import { Booking } from './booking.entity';

export enum ScheduleStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('class_schedules')
export class ClassSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ name: 'instructor_id' })
  instructorId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'max_capacity', default: 10 })
  maxCapacity: number;

  @Column({ name: 'current_enrolled', default: 0 })
  currentEnrolled: number;

  @Column({ name: 'waitlist_count', default: 0 })
  waitlistCount: number;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.SCHEDULED })
  status: ScheduleStatus;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_rule', nullable: true })
  recurringRule: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Class, (cls) => cls.schedules)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => Booking, (booking) => booking.schedule)
  bookings: Booking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
