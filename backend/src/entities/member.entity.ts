import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';
import { MemberPackage } from './member-package.entity';
import { CheckIn } from './check-in.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ name: 'emergency_contact_name', nullable: true })
  emergencyContactName: string;

  @Column({ name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone: string;

  @Column({ name: 'health_notes', type: 'text', nullable: true })
  healthNotes: string;

  @Column({ type: 'text', nullable: true })
  goals: string;

  @Column({ name: 'qr_code', unique: true })
  qrCode: string;

  @Column({ name: 'total_sessions_attended', default: 0 })
  totalSessionsAttended: number;

  @OneToOne(() => User, (user) => user.member)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Booking, (booking) => booking.member)
  bookings: Booking[];

  @OneToMany(() => MemberPackage, (mp) => mp.member)
  memberPackages: MemberPackage[];

  @OneToMany(() => CheckIn, (ci) => ci.member)
  checkIns: CheckIn[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
