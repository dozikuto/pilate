import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ReviewTargetType {
  SERVICE = 'service',
  INSTRUCTOR = 'instructor',
  MEMBER_PROGRESS = 'member_progress',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ReviewTargetType,
    default: ReviewTargetType.SERVICE,
  })
  targetType: ReviewTargetType;

  @Column({ name: 'target_id', nullable: true })
  targetId: string;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
