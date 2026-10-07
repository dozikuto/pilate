import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { Branch } from './branch.entity';
import { Member } from './member.entity';
import { Instructor } from './instructor.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', default: true })
  isVerified: boolean;

  @Column({ name: 'verification_code', nullable: true })
  verificationCode: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'refresh_token_hash', nullable: true })
  refreshTokenHash: string;

  @Column({ name: 'google_id', nullable: true })
  googleId: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @OneToOne(() => Member, (member) => member.user)
  member: Member;

  @OneToOne(() => Instructor, (instructor) => instructor.user)
  instructor: Instructor;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
