import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { User } from './user.entity';
import { Room } from './room.entity';
import { ClassSchedule } from './class-schedule.entity';

export enum ClassLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ALL = 'all',
}

export enum ClassType {
  GROUP = 'group',
  PRIVATE = 'private',
  SEMI_PRIVATE = 'semi_private',
}

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ClassLevel, default: ClassLevel.ALL })
  level: ClassLevel;

  @Column({ type: 'enum', enum: ClassType, default: ClassType.GROUP })
  type: ClassType;

  @Column({ name: 'default_instructor_id', nullable: true })
  defaultInstructorId: string;

  @Column({ name: 'default_room_id', nullable: true })
  defaultRoomId: string;

  @Column({ name: 'default_max_capacity', default: 10 })
  defaultMaxCapacity: number;

  @Column({ name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'default_instructor_id' })
  defaultInstructor: User;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'default_room_id' })
  defaultRoom: Room;

  @OneToMany(() => ClassSchedule, (schedule) => schedule.class)
  schedules: ClassSchedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
