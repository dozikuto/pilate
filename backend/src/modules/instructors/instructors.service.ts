import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Instructor } from '../../entities/instructor.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateInstructorDto, UpdateInstructorDto } from './dto/create-instructor.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';

const TZ = '+07:00';
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayVN(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(Instructor)
    private instructorsRepository: Repository<Instructor>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async listInstructors() {
    const instructors = await this.instructorsRepository.find({
      relations: ["user"],
    });
    return instructors
      .filter((i) => i.user && i.user.isActive !== false)
      .map((i) => ({
        id: i.id,
        userId: i.userId,
        fullName: i.user.fullName,
        avatarUrl: i.user.avatarUrl,
        bio: i.bio,
        specializations: i.specializations,
        certifications: i.certifications,
      }));
  }

  async getInstructorWeek(
    instructorUserId: string,
    weekStart?: string,
    currentUserId?: string,
  ) {
    const instructor = await this.usersRepository.findOne({
      where: { id: instructorUserId, role: UserRole.INSTRUCTOR },
    });
    if (!instructor)
      throw new NotFoundException("Không tìm thấy huấn luyện viên");

    const start =
      weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)
        ? weekStart
        : todayVN();
    const rangeStart = new Date(`${start}T00:00:00${TZ}`);
    const rangeEnd = new Date(`${addDays(start, 7)}T00:00:00${TZ}`);

    const schedules = await this.instructorsRepository.manager.getRepository(ClassSchedule)
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("schedule.room", "room")
      .leftJoinAndSelect("schedule.bookings", "booking")
      .leftJoinAndSelect("booking.member", "member")
      .where("schedule.instructorId = :instructorUserId", { instructorUserId })
      .andWhere("schedule.status != :cancelled", {
        cancelled: ScheduleStatus.CANCELLED,
      })
      .andWhere(
        "schedule.startTime >= :rangeStart AND schedule.startTime < :rangeEnd",
        { rangeStart, rangeEnd },
      )
      .orderBy("schedule.startTime", "ASC")
      .getMany();

    const now = new Date();
    const days = [] as any[];

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const dayStart = new Date(`${date}T00:00:00${TZ}`);
      const dayEnd = new Date(`${addDays(date, 1)}T00:00:00${TZ}`);

      const classes = schedules
        .filter((s) => s.startTime >= dayStart && s.startTime < dayEnd)
        .map((s) => {
          const activeBookings = (s.bookings || []).filter(
            (b) =>
              b.status === BookingStatus.CONFIRMED ||
              b.status === BookingStatus.ATTENDED,
          );
          const enrolled = Math.max(
            s.currentEnrolled || 0,
            activeBookings.length,
          );
          const capacity = s.maxCapacity || s.room?.capacity || 1;
          const isBooked = currentUserId
            ? activeBookings.some((b) => b.member?.userId === currentUserId)
            : false;
          return {
            id: s.id,
            className: s.class?.name ?? "Lớp Pilates",
            classType: s.class?.type,
            level: s.class?.level,
            room: s.room?.name ?? "Phòng tập",
            roomType: s.room?.roomType,
            startTime: s.startTime,
            endTime: s.endTime,
            capacity,
            enrolled,
            remaining: Math.max(capacity - enrolled, 0),
            isFull: enrolled >= capacity,
            isPast: s.startTime <= now,
            isBooked,
            waitlistCount: s.waitlistCount || 0,
          };
        });

      days.push({
        date,
        weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
        classes,
        totalClasses: classes.length,
        availableClasses: classes.filter((c) => !c.isFull && !c.isPast).length,
      });
    }

    return {
      instructor: {
        userId: instructor.id,
        fullName: instructor.fullName,
        avatarUrl: instructor.avatarUrl,
      },
      weekStart: start,
      weekEnd: addDays(start, 6),
      days,
    };
  }


  async findAll(pagination: PaginationDto) {
    const qb = this.instructorsRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.user', 'user')
      .where('user.isActive = :isActive', { isActive: true });

    if (pagination.search) {
      qb.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('instructor.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Instructor #${id} not found`);
    }
    const instructor = await this.instructorsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!instructor) throw new NotFoundException(`Instructor #${id} not found`);
    return instructor;
  }

  async create(dto: CreateInstructorDto) {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const defaultPassword = 'Coach@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      passwordHash,
      role: UserRole.INSTRUCTOR,
      branchId: dto.branchId,
    });
    const savedUser = await this.usersRepository.save(user);

    const instructor = this.instructorsRepository.create({
      userId: savedUser.id,
      bio: dto.bio,
      certifications: dto.certifications,
      specializations: dto.specializations,
      hourlyRate: dto.hourlyRate,
      commissionRate: dto.commissionRate,
    });
    const savedInstructor = await this.instructorsRepository.save(instructor);
    return this.findOne(savedInstructor.id);
  }

  async update(id: string, dto: UpdateInstructorDto) {
    const instructor = await this.findOne(id);

    if (dto.fullName || dto.phone) {
      await this.usersRepository.update(instructor.userId, {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone && { phone: dto.phone }),
      });
    }

    await this.instructorsRepository.update(id, {
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.certifications !== undefined && { certifications: dto.certifications }),
      ...(dto.specializations !== undefined && { specializations: dto.specializations }),
      ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
      ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const instructor = await this.findOne(id);
    await this.usersRepository.update(instructor.userId, { isActive: false, refreshTokenHash: null });
    return { success: true };
  }
}
