import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../entities/booking.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Member } from '../../entities/member.entity';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { CreateBookingDto, CancelBookingDto, UpdateBookingStatusDto } from './dto/create-booking.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(ClassSchedule)
    private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
  ) {}

  async findAll(pagination: PaginationDto, scheduleId?: string, memberId?: string) {
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.schedule', 'schedule')
      .leftJoinAndSelect('schedule.class', 'class')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('booking.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('booking.memberPackage', 'memberPackage');

    if (scheduleId) qb.andWhere('booking.scheduleId = :scheduleId', { scheduleId });
    if (memberId) qb.andWhere('booking.memberId = :memberId', { memberId });

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('booking.bookedAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: [
        'schedule',
        'schedule.class',
        'schedule.instructor',
        'schedule.room',
        'member',
        'member.user',
        'memberPackage',
      ],
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id: dto.scheduleId },
      relations: ['bookings'],
    });
    if (!schedule) throw new NotFoundException(`Schedule #${dto.scheduleId} not found`);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Cannot book a cancelled class');
    }

    const existing = await this.bookingsRepository.findOne({
      where: {
        scheduleId: dto.scheduleId,
        memberId: dto.memberId,
        status: BookingStatus.CONFIRMED,
      },
    });
    if (existing) {
      throw new ConflictException('Member has already booked this class');
    }

    if (dto.spotNumber) {
      const spotTaken = schedule.bookings.some(
        (b) => b.status === BookingStatus.CONFIRMED && b.spotNumber === dto.spotNumber,
      );
      if (spotTaken) {
        throw new ConflictException(`Spot #${dto.spotNumber} is already taken`);
      }
    }

    const isFull = schedule.currentEnrolled >= schedule.maxCapacity;
    const initialStatus = isFull ? BookingStatus.WAITLISTED : BookingStatus.CONFIRMED;

    let packageId = dto.memberPackageId;
    if (!packageId) {
      const activePackage = await this.memberPackagesRepository.findOne({
        where: { memberId: dto.memberId, status: MemberPackageStatus.ACTIVE },
        order: { expiryDate: 'ASC' },
      });
      if (activePackage) {
        packageId = activePackage.id;
      }
    }

    const booking = this.bookingsRepository.create({
      scheduleId: dto.scheduleId,
      memberId: dto.memberId,
      memberPackageId: packageId,
      spotNumber: isFull ? null : dto.spotNumber,
      status: initialStatus,
    });

    const saved = await this.bookingsRepository.save(booking);

    if (initialStatus === BookingStatus.CONFIRMED) {
      await this.schedulesRepository.increment({ id: dto.scheduleId }, 'currentEnrolled', 1);
    } else {
      await this.schedulesRepository.increment({ id: dto.scheduleId }, 'waitlistCount', 1);
    }

    return this.findOne(saved.id);
  }

  async cancel(id: string, dto: CancelBookingDto) {
    const booking = await this.findOne(id);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const now = new Date();
    const classStart = new Date(booking.schedule.startTime);
    const diffHours = (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancel = diffHours < 2;

    const previousStatus = booking.status;
    await this.bookingsRepository.update(id, {
      status: BookingStatus.CANCELLED,
      cancelledAt: now,
      cancelReason: dto.reason || 'Học viên hủy lịch',
      isLateCancel,
    });

    if (previousStatus === BookingStatus.CONFIRMED) {
      await this.schedulesRepository.decrement({ id: booking.scheduleId }, 'currentEnrolled', 1);

      const nextWaitlist = await this.bookingsRepository.findOne({
        where: { scheduleId: booking.scheduleId, status: BookingStatus.WAITLISTED },
        order: { bookedAt: 'ASC' },
      });

      if (nextWaitlist) {
        await this.bookingsRepository.update(nextWaitlist.id, {
          status: BookingStatus.CONFIRMED,
        });
        await this.schedulesRepository.increment({ id: booking.scheduleId }, 'currentEnrolled', 1);
        await this.schedulesRepository.decrement({ id: booking.scheduleId }, 'waitlistCount', 1);
      }
    } else if (previousStatus === BookingStatus.WAITLISTED) {
      await this.schedulesRepository.decrement({ id: booking.scheduleId }, 'waitlistCount', 1);
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    await this.findOne(id);
    await this.bookingsRepository.update(id, { status: dto.status });
    return this.findOne(id);
  }
}
