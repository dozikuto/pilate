import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';

export enum RoomType {
  PRIVATE_1V1 = 'private_1v1',
  SEMI_PRIVATE_1V2 = 'semi_private_1v2',
  SMALL_GROUP_1V3 = 'small_group_1v3',
  SMALL_GROUP_1V4 = 'small_group_1v4',
  GROUP = 'group',
}

export enum RoomStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  name: string;

  @Column({
    name: 'room_type',
    type: 'enum',
    enum: RoomType,
    default: RoomType.GROUP,
  })
  roomType: RoomType;

  @Column({ default: 10 })
  capacity: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  amenities: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Branch, (branch) => branch.rooms)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
