import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn, CheckInMethod } from '../../entities/check-in.entity';
import { Member } from '../../entities/member.entity';
import { Booking } from '../../entities/booking.entity';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PackagesService } from '../packages/packages.service';
import { QrCheckInDto, ManualCheckInDto } from './dto/check-in.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class CheckInsService {
  constructor(
    @InjectRepository(CheckIn)
    private checkInsRepository: Repository<CheckIn>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
    private packagesService: PackagesService,
  ) {}

  async findAll(pagination: PaginationDto, memberId?: string) {
    const qb = this.checkInsRepository
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('ci.schedule', 'schedule')
      .leftJoinAndSelect('schedule.class', 'class')
      .leftJoinAndSelect('ci.processedBy', 'processor');

    if (memberId) qb.andWhere('ci.memberId = :memberId', { memberId });

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('ci.checkInTime', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async qrCheckIn(dto: QrCheckInDto, processorId?: string) {
    let memberId: string;
    try {
      const parsed = JSON.parse(dto.qrData);
      memberId = parsed.memberId;
    } catch {
      
      const m = await this.membersRepository.findOne({ where: { qrCode: dto.qrData } });
      if (!m) throw new NotFoundException('Invalid QR code');
      memberId = m.id;
    }

    return this.processCheckIn({
      memberId,
      scheduleId: dto.scheduleId,
      method: CheckInMethod.QR,
      processorId,
    });
  }

  async manualCheckIn(dto: ManualCheckInDto, processorId?: string) {
    return this.processCheckIn({
      memberId: dto.memberId,
      scheduleId: dto.scheduleId,
      bookingId: dto.bookingId,
      method: CheckInMethod.MANUAL,
      processorId,
    });
  }

  private async processCheckIn(params: {
    memberId: string;
    scheduleId?: string;
    bookingId?: string;
    method: CheckInMethod;
    processorId?: string;
  }) {
    const member = await this.membersRepository.findOne({
      where: { id: params.memberId },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException(`Member #${params.memberId} not found`);

    let bookingId = params.bookingId;

    if (!bookingId && params.scheduleId) {
      const booking = await this.bookingsRepository.findOne({
        where: {
          memberId: params.memberId,
          scheduleId: params.scheduleId,
          status: BookingStatus.CONFIRMED,
        },
      });
      if (booking) bookingId = booking.id;
    }

    if (bookingId) {
      await this.bookingsRepository.update(bookingId, {
        status: BookingStatus.ATTENDED,
      });
    }

    const activePackage = await this.memberPackagesRepository.findOne({
      where: { memberId: params.memberId, status: MemberPackageStatus.ACTIVE },
      order: { expiryDate: 'ASC' },
    });

    if (activePackage) {
      await this.packagesService.deductSession(activePackage.id);
    }

    await this.membersRepository.increment({ id: params.memberId }, 'totalSessionsAttended', 1);

    const checkIn = this.checkInsRepository.create({
      memberId: params.memberId,
      bookingId,
      scheduleId: params.scheduleId,
      method: params.method,
      processedById: params.processorId,
    });

    const saved = await this.checkInsRepository.save(checkIn);

    return {
      success: true,
      message: `Check-in thành công cho học viên ${member.user.fullName}`,
      checkIn: saved,
      member: {
        id: member.id,
        fullName: member.user.fullName,
        remainingSessions: activePackage ? activePackage.remainingSessions : 0,
      },
    };
  }
}
