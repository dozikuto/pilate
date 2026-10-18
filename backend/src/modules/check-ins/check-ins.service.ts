import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ClassSchedule,
  ScheduleStatus,
} from "../../entities/class-schedule.entity";
import { PackageType } from "../../common/enums/package-type.enum";
import { isUUID } from "class-validator";
import { CheckIn, CheckInMethod } from "../../entities/check-in.entity";
import { Member } from "../../entities/member.entity";
import { Booking } from "../../entities/booking.entity";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { PackagesService } from "../packages/packages.service";
import { QrCheckInDto, ManualCheckInDto } from "./dto/check-in.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";

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
      .createQueryBuilder("ci")
      .leftJoinAndSelect("ci.member", "member")
      .leftJoinAndSelect("member.user", "user")
      .leftJoinAndSelect("ci.schedule", "schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("ci.processedBy", "processor");

    if (memberId) qb.andWhere("ci.memberId = :memberId", { memberId });

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("ci.checkInTime", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async qrCheckIn(dto: QrCheckInDto, processorId?: string) {
    let memberId: string;
    try {
      const parsed = JSON.parse(dto.qrData);
      memberId = parsed.memberId;
    } catch {
      const m = await this.membersRepository.findOne({
        where: { qrCode: dto.qrData },
      });
      if (!m) throw new NotFoundException("Invalid QR code");
      memberId = m.id;
    }

    return this.processCheckIn({
      memberId,
      scheduleId: dto.scheduleId,
      method: CheckInMethod.QR,
      processorId,
    });
  }

  async manualCheckIn(dto: ManualCheckInDto, processorId?: string, instructorId?: string) {
    return this.processCheckIn({
      memberId: dto.memberId,
      scheduleId: dto.scheduleId,
      bookingId: dto.bookingId,
      method: CheckInMethod.MANUAL,
      processorId,
      instructorId,
    });
  }

  private async processCheckIn(params: {
    memberId: string;
    scheduleId?: string;
    bookingId?: string;
    method: CheckInMethod;
    processorId?: string;
    instructorId?: string;
  }) {
    if (
      !isUUID(params.memberId) ||
      (params.scheduleId && !isUUID(params.scheduleId)) ||
      (params.bookingId && !isUUID(params.bookingId))
    )
      throw new BadRequestException("Mã học viên hoặc lịch không hợp lệ");
    return this.checkInsRepository.manager.transaction(async (manager) => {
      const members = manager.getRepository(Member),
        bookings = manager.getRepository(Booking),
        packages = manager.getRepository(MemberPackage),
        checkIns = manager.getRepository(CheckIn);
      // Same lock order as booking/cancellation: schedule, then member/package.
      if (!params.scheduleId && params.bookingId) {
        const linked = await bookings.findOneBy({ id: params.bookingId });
        if (!linked) throw new NotFoundException("Booking không tồn tại");
        params.scheduleId = linked.scheduleId;
      }
      if (params.scheduleId) {
        const schedule = await manager
          .getRepository(ClassSchedule)
          .findOne({
            where: { id: params.scheduleId },
            lock: { mode: "pessimistic_write" },
          });
        if (!schedule || schedule.status === ScheduleStatus.CANCELLED)
          throw new BadRequestException("Lịch không thể check-in");
        if (params.instructorId && schedule.instructorId !== params.instructorId)
          throw new ForbiddenException("Bạn chỉ được điểm danh ca dạy của mình");
      }
      const member = await members.findOne({
        where: { id: params.memberId },
        lock: { mode: "pessimistic_write" },
      });
      if (!member) throw new NotFoundException("Học viên không tồn tại");
      const memberWithUser = await members.findOne({
        where: { id: member.id },
        relations: ["user"],
      });
      if (!memberWithUser.user.isActive)
        throw new BadRequestException("Tài khoản đã bị khóa");
      let booking: Booking;
      if (params.bookingId) {
        booking = await bookings.findOneBy({ id: params.bookingId });
        if (
          !booking ||
          booking.memberId !== member.id ||
          (params.scheduleId && booking.scheduleId !== params.scheduleId)
        )
          throw new BadRequestException(
            "Booking không thuộc học viên/lịch này",
          );
      } else if (params.scheduleId) {
        booking = await bookings.findOne({
          where: {
            memberId: member.id,
            scheduleId: params.scheduleId,
            status: BookingStatus.CONFIRMED,
          },
        });
      }
      const scheduleId = params.scheduleId || booking?.scheduleId;
      if (
        (params.scheduleId || params.bookingId) &&
        (!booking || booking.status !== BookingStatus.CONFIRMED)
      )
        throw new ConflictException("Không có booking hợp lệ hoặc đã check-in");
      const duplicate = scheduleId
        ? await checkIns.findOneBy({ memberId: member.id, scheduleId })
        : await checkIns
            .createQueryBuilder("ci")
            .where("ci.memberId = :id", { id: member.id })
            .andWhere("ci.scheduleId IS NULL")
            .andWhere("ci.checkInTime >= :start", {
              start: new Date(new Date().setHours(0, 0, 0, 0)),
            })
            .getOne();
      if (duplicate) throw new ConflictException("Học viên đã check-in");
      let mp: MemberPackage;
      if (booking?.memberPackageId) {
        mp = await packages
          .createQueryBuilder("mp")
          .innerJoinAndSelect("mp.package", "p")
          .where("mp.id = :id", { id: booking.memberPackageId })
          .setLock("pessimistic_write")
          .getOne();
      } else {
        const today = new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 10);
        mp = await packages
          .createQueryBuilder("mp")
          .innerJoinAndSelect("mp.package", "p")
          .where("mp.memberId = :id", { id: member.id })
          .andWhere("mp.status = :active", {
            active: MemberPackageStatus.ACTIVE,
          })
          .andWhere("(mp.expiryDate IS NULL OR mp.expiryDate >= :today)", {
            today,
          })
          .andWhere("(p.type != :sessions OR mp.remainingSessions > 0)", {
            sessions: PackageType.SESSION_BASED,
          })
          .orderBy("mp.expiryDate", "ASC")
          .setLock("pessimistic_write")
          .getOne();
      }
      if (!mp) throw new BadRequestException("Không có gói tập hợp lệ");
      if (
        !booking?.sessionDeducted &&
        mp.package.type === PackageType.SESSION_BASED
      ) {
        if (mp.remainingSessions <= 0)
          throw new BadRequestException("Gói đã hết buổi");
        mp.remainingSessions -= 1;
        await packages.save(mp);
      }
      if (booking) {
        booking.status = BookingStatus.ATTENDED;
        booking.sessionDeducted = mp.package.type === PackageType.SESSION_BASED;
        await bookings.save(booking);
      }
      await members.increment({ id: member.id }, "totalSessionsAttended", 1);
      const checkIn = await checkIns.save(
        checkIns.create({
          memberId: member.id,
          bookingId: booking?.id,
          memberPackageId: mp.id,
          scheduleId,
          method: params.method,
          processedById: params.processorId,
          checkInTime: new Date(),
        }),
      );
      return {
        success: true,
        message: "Check-in thành công",
        checkIn,
        member: {
          id: member.id,
          fullName: memberWithUser.user.fullName,
          remainingSessions: mp.remainingSessions,
        },
      };
    });
  }
}
