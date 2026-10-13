import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "../../common/enums/user-role.enum";
import {
  PrivateSessionRequest,
  PrivateSessionStatus,
} from "../../entities/private-session-request.entity";
import { PackageType } from "../../common/enums/package-type.enum";
import { SystemSetting } from "../../entities/system-setting.entity";
import { Booking } from "../../entities/booking.entity";
import {
  ClassSchedule,
  ScheduleStatus,
} from "../../entities/class-schedule.entity";
import { Member } from "../../entities/member.entity";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import {
  CreateBookingDto,
  CancelBookingDto,
  UpdateBookingStatusDto,
} from "./dto/create-booking.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";

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

  async findAll(
    pagination: PaginationDto,
    scheduleId?: string,
    memberId?: string,
    user?: any,
  ) {
    const qb = this.bookingsRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.schedule", "schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("schedule.instructor", "instructor")
      .leftJoinAndSelect("booking.member", "member")
      .leftJoinAndSelect("member.user", "user")
      .leftJoinAndSelect("booking.memberPackage", "memberPackage");

    if (scheduleId)
      qb.andWhere("booking.scheduleId = :scheduleId", { scheduleId });
    if (user?.role === UserRole.MEMBER)
      qb.andWhere("member.userId = :owner", { owner: user.id });
    else if (memberId)
      qb.andWhere("booking.memberId = :memberId", { memberId });

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("booking.bookedAt", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string, user?: any) {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: [
        "schedule",
        "schedule.class",
        "schedule.instructor",
        "schedule.room",
        "member",
        "member.user",
        "memberPackage",
      ],
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    if (user?.role === UserRole.MEMBER && booking.member.userId !== user.id)
      throw new ForbiddenException("Booking không thuộc tài khoản của bạn");
    return booking;
  }

  async create(dto: CreateBookingDto, user?: any, allowWaitlist = true) {
    const bookingId = await this.bookingsRepository.manager.transaction(
      async (manager) => {
        const schedules = manager.getRepository(ClassSchedule);
        const bookings = manager.getRepository(Booking);
        const packages = manager.getRepository(MemberPackage);
        const schedule = await schedules.findOne({
          where: { id: dto.scheduleId },
          lock: { mode: "pessimistic_write" },
        });
        if (!schedule) throw new NotFoundException("Lịch học không tồn tại");
        if (
          schedule.status !== ScheduleStatus.SCHEDULED ||
          schedule.startTime <= new Date()
        )
          throw new BadRequestException("Lớp đã bắt đầu, hoàn tất hoặc bị hủy");
        const member = await manager
          .getRepository(Member)
          .findOne({
            where: { id: dto.memberId },
            lock: { mode: "pessimistic_write" },
          });
        if (!member) throw new NotFoundException("Học viên không tồn tại");
        if (user?.role === UserRole.MEMBER && member.userId !== user.id)
          throw new ForbiddenException("Không được đặt lịch cho học viên khác");
        if (
          await bookings.findOne({
            where: {
              scheduleId: schedule.id,
              memberId: member.id,
              status: BookingStatus.CONFIRMED,
            },
          })
        )
          throw new ConflictException("Bạn đã đặt lớp này");
        if (
          await bookings.findOne({
            where: {
              scheduleId: schedule.id,
              memberId: member.id,
              status: BookingStatus.WAITLISTED,
            },
          })
        )
          throw new ConflictException("Bạn đã có trong danh sách chờ");
        const conflict = await bookings
          .createQueryBuilder("b")
          .innerJoin("b.schedule", "s")
          .where("b.memberId = :id", { id: member.id })
          .andWhere("b.status IN (:...statuses)", {
            statuses: [BookingStatus.CONFIRMED, BookingStatus.ATTENDED],
          })
          .andWhere("s.status != :cancelled", {
            cancelled: ScheduleStatus.CANCELLED,
          })
          .andWhere("s.startTime < :end AND s.endTime > :start", {
            start: schedule.startTime,
            end: schedule.endTime,
          })
          .getOne();
        if (conflict)
          throw new BadRequestException("Học viên đã có lớp trùng giờ");
        const privateConflict = await manager
          .getRepository(PrivateSessionRequest)
          .createQueryBuilder("r")
          .where("r.memberUserId = :id", { id: member.userId })
          .andWhere("r.status = :status", {
            status: PrivateSessionStatus.APPROVED,
          })
          .andWhere("r.startTime < :end AND r.endTime > :start", {
            start: schedule.startTime,
            end: schedule.endTime,
          })
          .getOne();
        if (privateConflict)
          throw new BadRequestException(
            "Học viên đã có lịch tập riêng trùng giờ",
          );
        const day = new Date(schedule.startTime.getTime() + 7 * 3600000)
          .toISOString()
          .slice(0, 10);
        const today = new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 10);
        const packageQuery = packages
          .createQueryBuilder("mp")
          .innerJoinAndSelect("mp.package", "p")
          .where("mp.memberId = :memberId", { memberId: member.id })
          .andWhere("mp.status = :active", {
            active: MemberPackageStatus.ACTIVE,
          })
          .andWhere("mp.startDate <= :today", { today })
          .andWhere("(mp.expiryDate IS NULL OR mp.expiryDate >= :day)", { day })
          .andWhere("(p.type != :sessions OR mp.remainingSessions > 0)", {
            sessions: PackageType.SESSION_BASED,
          })
          .orderBy("mp.expiryDate", "ASC", "NULLS LAST")
          .setLock("pessimistic_write");
        if (dto.memberPackageId)
          packageQuery.andWhere("mp.id = :packageId", {
            packageId: dto.memberPackageId,
          });
        const activePackage = await packageQuery.getOne();
        if (!activePackage)
          throw new BadRequestException(
            "Không có gói tập còn hiệu lực và buổi tập hợp lệ",
          );
        const activeBookings = await bookings.find({
          where: { scheduleId: schedule.id },
        });
        const occupied = activeBookings.filter((b) =>
          [BookingStatus.CONFIRMED, BookingStatus.ATTENDED].includes(b.status),
        );
        const isFull = occupied.length >= schedule.maxCapacity;
        if (isFull && !allowWaitlist)
          throw new BadRequestException("Lớp đã đủ số lượng học viên");
        if (dto.spotNumber && dto.spotNumber > schedule.maxCapacity)
          throw new BadRequestException("Vị trí vượt sức chứa lớp");
        if (
          dto.spotNumber &&
          occupied.some((b) => b.spotNumber === dto.spotNumber)
        )
          throw new ConflictException("Vị trí đã được đặt");
        const freeSpot = Array.from(
          { length: schedule.maxCapacity },
          (_, i) => i + 1,
        ).find((n) => !occupied.some((b) => b.spotNumber === n));
        const deduct =
          !isFull && activePackage.package.type === PackageType.SESSION_BASED;
        const saved = await bookings.save(
          bookings.create({
            scheduleId: schedule.id,
            memberId: member.id,
            memberPackageId: activePackage.id,
            status: isFull ? BookingStatus.WAITLISTED : BookingStatus.CONFIRMED,
            spotNumber: isFull ? null : dto.spotNumber || freeSpot,
            sessionDeducted: deduct,
          }),
        );
        if (deduct) {
          activePackage.remainingSessions -= 1;
          await packages.save(activePackage);
        }
        schedule.currentEnrolled = occupied.length + (isFull ? 0 : 1);
        schedule.waitlistCount =
          activeBookings.filter((b) => b.status === BookingStatus.WAITLISTED)
            .length + (isFull ? 1 : 0);
        await schedules.save(schedule);
        return saved.id;
      },
    );
    return this.findOne(bookingId, user);
  }

  async cancel(id: string, dto: CancelBookingDto, user?: any) {
    const existing = await this.findOne(id, user);
    await this.bookingsRepository.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(ClassSchedule),
        bookings = manager.getRepository(Booking),
        packages = manager.getRepository(MemberPackage);
      const schedule = await schedules.findOne({
        where: { id: existing.scheduleId },
        lock: { mode: "pessimistic_write" },
      });
      const booking = await bookings.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (
        ![BookingStatus.CONFIRMED, BookingStatus.WAITLISTED].includes(
          booking.status,
        )
      )
        throw new BadRequestException(
          "Không thể hủy booking đã hủy hoặc đã tham dự",
        );
      const previous = booking.status;
      const settings = await manager
        .getRepository(SystemSetting)
        .findOneBy({ key: "config" });
      const late =
        (schedule.startTime.getTime() - Date.now()) / 3600000 <
        (settings?.value.cancelHoursLimit ?? 2);
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelReason = dto.reason || "Học viên hủy lịch";
      booking.isLateCancel = late;
      if (booking.sessionDeducted && !late && booking.memberPackageId) {
        await packages.increment(
          { id: booking.memberPackageId },
          "remainingSessions",
          1,
        );
        booking.sessionDeducted = false;
      }
      await bookings.save(booking);
      if (previous === BookingStatus.CONFIRMED) {
        schedule.currentEnrolled = Math.max(0, schedule.currentEnrolled - 1);
        const waiting =
          settings?.value.autoPromoteWaitlist === false
            ? []
            : await bookings.find({
                where: {
                  scheduleId: schedule.id,
                  status: BookingStatus.WAITLISTED,
                },
                order: { bookedAt: "ASC" },
              });
        for (const next of waiting) {
          const waitingMember = await manager
            .getRepository(Member)
            .findOne({
              where: { id: next.memberId },
              lock: { mode: "pessimistic_write" },
            });
          const conflict = await bookings
            .createQueryBuilder("b")
            .innerJoin("b.schedule", "s")
            .where("b.memberId = :memberId", { memberId: next.memberId })
            .andWhere("b.status IN (:...statuses)", {
              statuses: [BookingStatus.CONFIRMED, BookingStatus.ATTENDED],
            })
            .andWhere("s.status != :cancelled", {
              cancelled: ScheduleStatus.CANCELLED,
            })
            .andWhere("s.startTime < :end AND s.endTime > :start", {
              start: schedule.startTime,
              end: schedule.endTime,
            })
            .getOne();
          if (!waitingMember || conflict) continue;
          const mp = await packages
            .createQueryBuilder("mp")
            .innerJoinAndSelect("mp.package", "p")
            .where("mp.id = :id", { id: next.memberPackageId })
            .setLock("pessimistic_write")
            .getOne();
          const day = new Date(schedule.startTime.getTime() + 7 * 3600000)
            .toISOString()
            .slice(0, 10);
          if (
            !mp ||
            mp.status !== MemberPackageStatus.ACTIVE ||
            (mp.expiryDate &&
              new Date(mp.expiryDate).toISOString().slice(0, 10) < day) ||
            (mp.package.type === PackageType.SESSION_BASED &&
              mp.remainingSessions <= 0)
          )
            continue;
          next.status = BookingStatus.CONFIRMED;
          next.spotNumber = booking.spotNumber;
          next.sessionDeducted = mp.package.type === PackageType.SESSION_BASED;
          if (next.sessionDeducted)
            await packages.decrement({ id: mp.id }, "remainingSessions", 1);
          await bookings.save(next);
          schedule.currentEnrolled += 1;
          break;
        }
      }
      schedule.waitlistCount = await bookings.countBy({
        scheduleId: schedule.id,
        status: BookingStatus.WAITLISTED,
      });
      await schedules.save(schedule);
    });
    return this.findOne(id, user);
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    await this.findOne(id);
    await this.bookingsRepository.update(id, { status: dto.status });
    return this.findOne(id);
  }
}
