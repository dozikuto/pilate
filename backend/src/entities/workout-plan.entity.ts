import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { User } from './user.entity';
import { ClassSchedule } from './class-schedule.entity';

@Entity('workout_plans')
export class WorkoutPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'instructor_id' })
  instructorId: string;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  exercises: string;

  @Column({ name: 'progress_notes', type: 'text', nullable: true })
  progressNotes: string;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ name: 'core_score', type: 'decimal', precision: 3, scale: 1, nullable: true })
  coreScore: number;

  @Column({ name: 'flexibility_score', type: 'decimal', precision: 3, scale: 1, nullable: true })
  flexibilityScore: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @ManyToOne(() => ClassSchedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ClassSchedule;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
