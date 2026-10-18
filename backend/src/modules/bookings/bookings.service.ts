import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Class, ClassType } from "../../entities/class.entity";
import { PrivateSessionType } from "../../common/enums/private-session-type.enum";
import { UserRole } from "../../common/enums/user-role.enum";
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
  BookPackageSchedulesDto,
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
      (manager) => this.createInTransaction(manager, dto, user, allowWaitlist),
    );
    return this.findOne(bookingId, user);
  }

  async bookPackageSchedules(dto: BookPackageSchedulesDto, user: any) {
    const member = await this.membersRepository.findOneBy({ userId: user.id });
    if (!member) throw new NotFoundException("Không tìm thấy hồ sơ học viên");
    return this.bookingsRepository.manager.transaction(async (manager) => {
      // Lock every requested schedule in stable order before locking member/package.
      // Other bookings/cancellations cannot consume seats halfway through a batch.
      const schedules = await manager
        .getRepository(ClassSchedule)
        .createQueryBuilder("s")
        .where("s.id IN (:...ids)", { ids: dto.scheduleIds })
        .orderBy("s.id", "ASC")
        .setLock("pessimistic_write")
        .getMany();
      if (schedules.length !== dto.scheduleIds.length)
        throw new NotFoundException("Một hoặc nhiều buổi học không tồn tại");
      const bookingIds: string[] = [];
      for (const schedule of schedules) {
        bookingIds.push(
          await this.createInTransaction(
            manager,
            {
              scheduleId: schedule.id,
              memberId: member.id,
              memberPackageId: dto.memberPackageId,
            },
            user,
            true,
          ),
        );
      }
      const createdBookings = await manager
        .getRepository(Booking)
        .createQueryBuilder("b")
        .where("b.id IN (:...ids)", { ids: bookingIds })
        .getMany();
      const confirmedCount = createdBookings.filter(
        (b) => b.status === BookingStatus.CONFIRMED,
      ).length;
      const waitlistedCount = createdBookings.filter(
        (b) => b.status === BookingStatus.WAITLISTED,
      ).length;
      const memberPackage = await manager
        .getRepository(MemberPackage)
        .findOneBy({ id: dto.memberPackageId });
      return {
        bookingIds,
        bookedCount: bookingIds.length,
        confirmedCount,
        waitlistedCount,
        memberPackageId: dto.memberPackageId,
        remainingSessions: memberPackage.remainingSessions,
      };
    });
  }

  private async createInTransaction(
    manager: EntityManager,
    dto: CreateBookingDto,
    user: any,
    allowWaitlist: boolean,
  ) {
    const schedules = manager.getRepository(ClassSchedule);
    const bookings = manager.getRepository(Booking);
    const packages = manager.getRepository(MemberPackage);
    const schedule = await schedules.findOne({
      where: { id: dto.scheduleId },
      lock: { mode: "pessimistic_write" },
    });
    if (!schedule) throw new NotFoundException("Lịch học không tồn tại");
    const cls = await manager
      .getRepository(Class)
      .findOneBy({ id: schedule.classId });
    if (!cls?.isActive)
      throw new BadRequestException("Lớp học đã ngừng hoạt động");
    if (
      schedule.status !== ScheduleStatus.SCHEDULED ||
      schedule.startTime <= new Date()
    )
      throw new BadRequestException("Lớp đã bắt đầu, hoàn tất hoặc bị hủy");
    const member = await manager.getRepository(Member).findOne({
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
    if (conflict) throw new BadRequestException("Học viên đã có lớp trùng giờ");
    const day = new Date(schedule.startTime.getTime() + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
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
    const isPrivate = cls.type !== ClassType.GROUP;
    packageQuery.andWhere("p.privateSessionEnabled = :isPrivate", {
      isPrivate,
    });
    if (isPrivate) {
      const modes = {
        1: PrivateSessionType.PRIVATE_1V1,
        2: PrivateSessionType.SEMI_PRIVATE_1V2,
        3: PrivateSessionType.SMALL_GROUP_1V3,
        4: PrivateSessionType.SMALL_GROUP_1V4,
      };
      const duration =
        (schedule.endTime.getTime() - schedule.startTime.getTime()) / 60000;
      if (!modes[schedule.maxCapacity])
        throw new BadRequestException(
          "Lớp tập riêng phải có sức chứa từ 1 đến 4",
        );
      packageQuery
        .andWhere("p.privateSessionType = :mode", {
          mode: modes[schedule.maxCapacity],
        })
        .andWhere("p.privateSessionDurationMinutes = :duration", { duration });
    }
    if (dto.memberPackageId)
      packageQuery.andWhere("mp.id = :packageId", {
        packageId: dto.memberPackageId,
      });
    const activePackage = await packageQuery.getOne();
    if (!activePackage)
      throw new BadRequestException(
        "Gói tập hết buổi, ngoài hạn sử dụng hoặc không phù hợp hình thức/thời lượng của lớp",
      );
    const activeBookings = await bookings.find({
      where: { scheduleId: schedule.id },
    });
    const occupied = activeBookings.filter((b) =>
      [BookingStatus.CONFIRMED, BookingStatus.ATTENDED].includes(b.status),
    );
    await this.assertDuoPair(manager, activePackage, schedule, occupied);
    const isFull = occupied.length >= schedule.maxCapacity;
    if (isFull && !allowWaitlist)
      throw new BadRequestException("Lớp đã đủ số lượng học viên");
    if (dto.spotNumber && dto.spotNumber > schedule.maxCapacity)
      throw new BadRequestException("Vị trí vượt sức chứa lớp");
    if (dto.spotNumber && occupied.some((b) => b.spotNumber === dto.spotNumber))
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
  }

  private async assertDuoPair(
    manager: EntityManager,
    mp: MemberPackage,
    schedule: ClassSchedule,
    occupied: Booking[],
  ) {
    if (
      !mp.package.privateSessionEnabled ||
      mp.package.privateSessionType !== PrivateSessionType.SEMI_PRIVATE_1V2
    )
      return;
    if (!mp.duoPartnerPackageId)
      throw new BadRequestException(
        "Gói 1:2 cần được lễ tân ghép với học viên tập cùng trước khi đặt lịch",
      );
    const partner = await manager
      .getRepository(MemberPackage)
      .findOne({
        where: { id: mp.duoPartnerPackageId },
        relations: ["package", "member", "member.user"],
      });
    const day = new Date(schedule.startTime.getTime() + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
    if (
      !partner ||
      partner.duoPartnerPackageId !== mp.id ||
      partner.memberId === mp.memberId ||
      !partner.member.user.isActive ||
      partner.status !== MemberPackageStatus.ACTIVE ||
      !partner.package.privateSessionEnabled ||
      partner.package.privateSessionType !==
        PrivateSessionType.SEMI_PRIVATE_1V2 ||
      partner.package.privateSessionDurationMinutes !==
        mp.package.privateSessionDurationMinutes ||
      (partner.expiryDate && String(partner.expiryDate).slice(0, 10) < day) ||
      String(partner.startDate).slice(0, 10) > day
    )
      throw new BadRequestException(
        "Gói của người tập cùng chưa hợp lệ cho buổi này; vui lòng liên hệ lễ tân",
      );
    if (occupied.some((b) => ![mp.id, partner.id].includes(b.memberPackageId)))
      throw new ConflictException(
        "Ca 1:2 này đã được một cặp học viên khác đặt",
      );
    if (
      partner.package.type === PackageType.SESSION_BASED &&
      partner.remainingSessions <= 0 &&
      !occupied.some((b) => b.memberPackageId === partner.id)
    )
      throw new BadRequestException(
        "Gói của người tập cùng đã hết số buổi có thể đặt",
      );
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
      const cancelHoursLimit = Number(settings?.value?.cancelHoursLimit ?? 2);
      const late =
        previous === BookingStatus.CONFIRMED &&
        (schedule.startTime.getTime() - Date.now()) / 3600000 <
          cancelHoursLimit;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelReason = dto.reason || "Học viên hủy lịch";
      booking.isLateCancel = late;
      if (previous === BookingStatus.CONFIRMED && booking.memberPackageId) {
        if (booking.sessionDeducted && !late) {
          await packages.increment(
            { id: booking.memberPackageId },
            "remainingSessions",
            1,
          );
          booking.sessionDeducted = false;
        } else if (!booking.sessionDeducted && late) {
          const mp = await packages.findOne({
            where: { id: booking.memberPackageId },
            relations: ["package"],
          });
          if (
            mp &&
            mp.package?.type === PackageType.SESSION_BASED &&
            mp.remainingSessions > 0
          ) {
            await packages.decrement({ id: mp.id }, "remainingSessions", 1);
            booking.sessionDeducted = true;
          }
        }
      }
      await bookings.save(booking);
      if (previous === BookingStatus.CONFIRMED) {
        schedule.currentEnrolled = Math.max(0, schedule.currentEnrolled - 1);
        const waiting =
          settings?.value?.autoPromoteWaitlist === false
            ? []
            : await bookings.find({
                where: {
                  scheduleId: schedule.id,
                  status: BookingStatus.WAITLISTED,
                },
                order: { bookedAt: "ASC" },
              });
        for (const next of waiting) {
          const waitingMember = await manager.getRepository(Member).findOne({
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
            (mp.expiryDate && String(mp.expiryDate).slice(0, 10) < day) ||
            (mp.package.type === PackageType.SESSION_BASED &&
              mp.remainingSessions <= 0)
          )
            continue;
          let occupied: Booking[] = [];
          try {
            occupied = await bookings.find({
              where: {
                scheduleId: schedule.id,
                status: BookingStatus.CONFIRMED,
              },
            });
            await this.assertDuoPair(manager, mp, schedule, occupied);
          } catch (error) {
            if (
              error instanceof BadRequestException ||
              error instanceof ConflictException
            )
              continue;
            throw error;
          }
          const freeSpot =
            booking.spotNumber ||
            Array.from({ length: schedule.maxCapacity }, (_, i) => i + 1).find(
              (n) => !occupied.some((b) => b.spotNumber === n),
            );
          next.status = BookingStatus.CONFIRMED;
          next.spotNumber = freeSpot ?? 1;
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
    const existing = await this.findOne(id);
    await this.bookingsRepository.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(ClassSchedule);
      const bookings = manager.getRepository(Booking);
      const packages = manager.getRepository(MemberPackage);
      const schedule = await schedules.findOne({
        where: { id: existing.scheduleId },
        lock: { mode: "pessimistic_write" },
      });
      const booking = await bookings.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!booking || !schedule)
        throw new NotFoundException("Không tìm thấy thông tin đặt chỗ");

      const previous = booking.status;
      if (
        previous === BookingStatus.WAITLISTED &&
        dto.status === BookingStatus.CONFIRMED
      ) {
        const occupied = await bookings.find({
          where: {
            scheduleId: schedule.id,
            status: BookingStatus.CONFIRMED,
          },
        });
        if (occupied.length >= schedule.maxCapacity) {
          throw new BadRequestException(
            "Lớp học đã đủ sĩ số, không thể đôn thêm học viên từ danh sách chờ",
          );
        }
        if (booking.memberPackageId) {
          const mp = await packages.findOne({
            where: { id: booking.memberPackageId },
            relations: ["package"],
          });
          if (mp && mp.package?.type === PackageType.SESSION_BASED) {
            if (mp.remainingSessions <= 0) {
              throw new BadRequestException(
                "Gói tập của học viên trong danh sách chờ đã hết buổi",
              );
            }
            await packages.decrement({ id: mp.id }, "remainingSessions", 1);
            booking.sessionDeducted = true;
          }
        }
        const freeSpot = Array.from(
          { length: schedule.maxCapacity },
          (_, i) => i + 1,
        ).find((n) => !occupied.some((b) => b.spotNumber === n));
        booking.spotNumber = freeSpot ?? 1;
      }

      booking.status = dto.status;
      await bookings.save(booking);

      schedule.currentEnrolled = await bookings.countBy({
        scheduleId: schedule.id,
        status: BookingStatus.CONFIRMED,
      });
      schedule.waitlistCount = await bookings.countBy({
        scheduleId: schedule.id,
        status: BookingStatus.WAITLISTED,
      });
      await schedules.save(schedule);
    });
    return this.findOne(id);
  }
}
