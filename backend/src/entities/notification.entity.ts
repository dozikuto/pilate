import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  REMINDER = 'reminder',
  ALERT = 'alert',
  PROMO = 'promo',
  SYSTEM = 'system',
}

export enum NotificationChannel {
  ZALO = 'zalo',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.PUSH })
  channel: NotificationChannel;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
