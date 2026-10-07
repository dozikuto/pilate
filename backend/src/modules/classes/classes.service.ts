import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Class } from '../../entities/class.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Member } from '../../entities/member.entity';
import { Booking } from '../../entities/booking.entity';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { CreateClassDto, CreateScheduleDto } from './dto/create-class.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(ClassSchedule)
    private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
  ) {}

  async findAllClasses(pagination: PaginationDto) {
    const qb = this.classesRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.branch', 'branch')
      .leftJoinAndSelect('class.defaultInstructor', 'instructor')
      .leftJoinAndSelect('class.defaultRoom', 'room');

    if (pagination.search) {
      qb.where('class.name ILIKE :search', { search: `%${pagination.search}%` });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('class.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOneClass(id: string) {
    const cls = await this.classesRepository.findOne({
      where: { id },
      relations: ['branch', 'defaultInstructor', 'defaultRoom'],
    });
    if (!cls) throw new NotFoundException(`Class #${id} not found`);
    return cls;
  }

  createClass(dto: CreateClassDto) {
    const cls = this.classesRepository.create(dto);
    return this.classesRepository.save(cls);
  }

  async updateClass(id: string, dto: Partial<CreateClassDto>) {
    await this.findOneClass(id);
    await this.classesRepository.update(id, dto);
    return this.findOneClass(id);
  }

  async removeClass(id: string) {
    await this.findOneClass(id);
    await this.classesRepository.update(id, { isActive: false });
    return { success: true };
  }

  async findSchedules(startDate?: string, endDate?: string, instructorId?: string, date?: string, userId?: string) {
    const qb = this.schedulesRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.class', 'class')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('schedule.room', 'room')
      .leftJoinAndSelect('schedule.bookings', 'booking')
      .leftJoinAndSelect('booking.member', 'member')
      .leftJoinAndSelect('member.user', 'memberUser');

    if (date) {
      
      const dStart = new Date(`${date}T00:00:00+07:00`);
      const dEnd = new Date(`${date}T23:59:59.999+07:00`);
      qb.andWhere('schedule.startTime >= :dStart AND schedule.startTime <= :dEnd', {
        dStart,
        dEnd,
      });
    } else if (startDate && endDate) {
      qb.andWhere('schedule.startTime BETWEEN :start AND :end', {
        start: new Date(startDate),
        end: new Date(endDate),
      });
    }

    if (instructorId) {
      qb.andWhere('schedule.instructorId = :instructorId', { instructorId });
    }

    qb.orderBy('schedule.startTime', 'ASC');
    const items = await qb.getMany();

    return items.map((s) => {
      const isBooked = userId && s.bookings
        ? s.bookings.some(
            (b) =>
              b.member?.userId === userId &&
              (b.status === BookingStatus.CONFIRMED || (b as any).status === 'confirmed'),
          )
        : false;

      return {
        ...s,
        className: s.class?.name ?? 'Lớp Pilates',
        instructor: {
          id: s.instructor?.id,
          fullName: s.instructor?.fullName ?? 'HLV Pilates',
          avatarUrl: s.instructor?.avatarUrl,
        },
        room: s.room?.name ?? 'Phòng tập',
        capacity: s.maxCapacity,
        enrolled: s.currentEnrolled,
        isBooked,
        status:
          s.currentEnrolled >= s.maxCapacity
            ? 'full'
            : s.currentEnrolled >= s.maxCapacity - 2
            ? 'nearly_full'
            : 'available',
      };
    });
  }

  async findUpcoming(limit = 3, userId?: string) {
    const qb = this.schedulesRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.class', 'class')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('schedule.room', 'room')
      .leftJoinAndSelect('schedule.bookings', 'booking')
      .leftJoinAndSelect('booking.member', 'member')
      .where('schedule.status = :status', { status: ScheduleStatus.SCHEDULED })
      .andWhere('schedule.startTime >= :now', { now: new Date() })
      .orderBy('schedule.startTime', 'ASC')
      .take(limit);

    const schedules = await qb.getMany();

    return schedules.map((s) => {
      const isBooked = userId && s.bookings
        ? s.bookings.some(
            (b) =>
              b.member?.userId === userId &&
              (b.status === BookingStatus.CONFIRMED || (b as any).status === 'confirmed'),
          )
        : false;

      return {
        id: s.id,
        className: s.class?.name ?? 'Lớp Pilates',
        instructor: {
          id: s.instructor?.id,
          fullName: s.instructor?.fullName ?? 'HLV Pilates',
          avatarUrl: s.instructor?.avatarUrl,
        },
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        room: s.room?.name ?? 'Phòng tập',
        capacity: s.maxCapacity,
        enrolled: s.currentEnrolled,
        isBooked,
        status:
          s.currentEnrolled >= s.maxCapacity
            ? 'full'
            : s.currentEnrolled >= s.maxCapacity - 2
            ? 'nearly_full'
            : 'available',
      };
    });
  }

  async findOneSchedule(id: string) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id },
      relations: [
        'class',
        'instructor',
        'room',
        'bookings',
        'bookings.member',
        'bookings.member.user',
      ],
    });
    if (!schedule) throw new NotFoundException(`Schedule #${id} not found`);
    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto) {
    const cls = await this.findOneClass(dto.classId);

    const schedule = this.schedulesRepository.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      maxCapacity: dto.maxCapacity || cls.defaultMaxCapacity,
      status: ScheduleStatus.SCHEDULED,
    });

    return this.schedulesRepository.save(schedule);
  }

  async updateSchedule(id: string, dto: Partial<CreateScheduleDto>) {
    await this.findOneSchedule(id);
    const updateData: any = { ...dto };
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);

    await this.schedulesRepository.update(id, updateData);
    return this.findOneSchedule(id);
  }

  async cancelSchedule(id: string) {
    await this.findOneSchedule(id);
    await this.schedulesRepository.update(id, { status: ScheduleStatus.CANCELLED });
    return { success: true, message: 'Class schedule cancelled' };
  }

  async getScheduleSpots(id: string) {
    const schedule = await this.findOneSchedule(id);
    const bookedSpots = schedule.bookings
      .filter((b) => b.status === 'confirmed')
      .map((b) => ({
        spotNumber: b.spotNumber,
        bookingId: b.id,
        memberName: b.member?.user?.fullName,
      }));

    const spots = [];
    for (let i = 1; i <= schedule.maxCapacity; i++) {
      const booked = bookedSpots.find((s) => s.spotNumber === i);
      spots.push({
        spotNumber: i,
        isAvailable: !booked,
        booking: booked || null,
      });
    }

    return {
      scheduleId: id,
      maxCapacity: schedule.maxCapacity,
      enrolledCount: bookedSpots.length,
      availableSpots: schedule.maxCapacity - bookedSpots.length,
      spots,
    };
  }

  async bookSchedule(scheduleId: string, userId: string) {
    const member = await this.membersRepository.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Hồ sơ học viên không tồn tại');
    }

    const schedule = await this.schedulesRepository.findOne({
      where: { id: scheduleId },
      relations: ['class'],
    });
    if (!schedule) {
      throw new NotFoundException('Lịch học không tồn tại');
    }
    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Lớp học này đã bị hủy');
    }
    if (schedule.currentEnrolled >= schedule.maxCapacity) {
      throw new BadRequestException('Lớp học đã đủ số lượng học viên');
    }

    const existing = await this.bookingsRepository.findOne({
      where: {
        scheduleId,
        memberId: member.id,
        status: BookingStatus.CONFIRMED,
      },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã đặt chỗ cho lớp học này rồi');
    }

    const activePackage = await this.memberPackagesRepository.findOne({
      where: {
        memberId: member.id,
        status: MemberPackageStatus.ACTIVE,
      },
      order: { expiryDate: 'ASC' },
    });

    if (!activePackage || activePackage.remainingSessions <= 0) {
      throw new BadRequestException('Bạn chưa có gói tập hợp lệ hoặc đã hết buổi tập. Vui lòng mua thêm gói.');
    }

    const booking = this.bookingsRepository.create({
      scheduleId,
      memberId: member.id,
      memberPackageId: activePackage.id,
      status: BookingStatus.CONFIRMED,
      bookedAt: new Date(),
    });

    await this.bookingsRepository.save(booking);

    schedule.currentEnrolled = (schedule.currentEnrolled || 0) + 1;
    await this.schedulesRepository.save(schedule);

    activePackage.remainingSessions = Math.max(0, activePackage.remainingSessions - 1);
    await this.memberPackagesRepository.save(activePackage);

    return {
      success: true,
      message: 'Đặt chỗ lớp học thành công!',
      bookingId: booking.id,
      remainingSessions: activePackage.remainingSessions,
    };
  }

  async cancelBookingForSchedule(scheduleId: string, userId: string) {
    const member = await this.membersRepository.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Hồ sơ học viên không tồn tại');
    }

    const booking = await this.bookingsRepository.findOne({
      where: {
        scheduleId,
        memberId: member.id,
        status: BookingStatus.CONFIRMED,
      },
      relations: ['memberPackage'],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy lịch đặt chỗ của bạn cho lớp này');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    await this.bookingsRepository.save(booking);

    const schedule = await this.schedulesRepository.findOne({ where: { id: scheduleId } });
    if (schedule && schedule.currentEnrolled > 0) {
      schedule.currentEnrolled -= 1;
      await this.schedulesRepository.save(schedule);
    }

    if (booking.memberPackage) {
      booking.memberPackage.remainingSessions = (booking.memberPackage.remainingSessions || 0) + 1;
      await this.memberPackagesRepository.save(booking.memberPackage);
    }

    return {
      success: true,
      message: 'Hủy đặt chỗ thành công và đã hoàn lại 1 buổi tập vào gói của bạn.',
    };
  }
}
