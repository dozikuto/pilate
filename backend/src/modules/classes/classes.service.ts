import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { BookingsService } from "../bookings/bookings.service";
import { Room } from "../../entities/room.entity";
import { User } from "../../entities/user.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { UpdateScheduleDto } from "./dto/create-class.dto";
import { Class } from "../../entities/class.entity";
import {
  ClassSchedule,
  ScheduleStatus,
} from "../../entities/class-schedule.entity";
import { Member } from "../../entities/member.entity";
import { Booking } from "../../entities/booking.entity";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import {
  PrivateSessionRequest,
  PrivateSessionStatus,
} from "../../entities/private-session-request.entity";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { CreateClassDto, CreateScheduleDto } from "./dto/create-class.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";

@Injectable()
export class ClassesService {
  constructor(
    private readonly bookingsService: BookingsService,
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
    @InjectRepository(PrivateSessionRequest)
    private privateRequestsRepository: Repository<PrivateSessionRequest>,
  ) {}

  async findAllClasses(pagination: PaginationDto) {
    const qb = this.classesRepository
      .createQueryBuilder("class")
      .leftJoinAndSelect("class.branch", "branch")
      .leftJoinAndSelect("class.defaultInstructor", "instructor")
      .leftJoinAndSelect("class.defaultRoom", "room");

    qb.where("class.isActive = :active", { active: true });
    if (pagination.search) {
      qb.andWhere("class.name ILIKE :search", {
        search: `%${pagination.search}%`,
      });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("class.createdAt", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOneClass(id: string) {
    const cls = await this.classesRepository.findOne({
      where: { id },
      relations: ["branch", "defaultInstructor", "defaultRoom"],
    });
    if (!cls) throw new NotFoundException(`Class #${id} not found`);
    return cls;
  }

  async createClass(dto: CreateClassDto) {
    if (!dto.branchId) {
      const branch = await this.classesRepository.manager
        .getRepository("Branch")
        .findOne({ where: {} });
      if (branch) {
        dto.branchId = (branch as any).id;
      }
    }
    const cls = this.classesRepository.create(dto);
    return this.classesRepository.save(cls);
  }

  async updateClass(id: string, dto: Partial<CreateClassDto>) {
    await this.findOneClass(id);
    await this.classesRepository.update(id, dto);
    return this.findOneClass(id);
  }

  async removeClass(id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { success: true };
    }
    const cls = await this.classesRepository.findOne({ where: { id } });
    if (!cls) return { success: true };
    try {
      await this.classesRepository.delete(id);
    } catch {
      await this.classesRepository.update(id, { isActive: false });
    }
    return { success: true };
  }

  async findSchedules(
    startDate?: string,
    endDate?: string,
    instructorId?: string,
    date?: string,
    userId?: string,
  ) {
    const qb = this.schedulesRepository
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("schedule.instructor", "instructor")
      .leftJoinAndSelect("schedule.room", "room")
      .leftJoinAndSelect("schedule.bookings", "booking")
      .leftJoinAndSelect("booking.member", "member")
      .leftJoinAndSelect("member.user", "memberUser");

    qb.andWhere("schedule.status != :cancelled", {
      cancelled: ScheduleStatus.CANCELLED,
    });

    if (date) {
      const dStart = new Date(`${date}T00:00:00+07:00`);
      const dEnd = new Date(`${date}T23:59:59.999+07:00`);
      qb.andWhere(
        "schedule.startTime >= :dStart AND schedule.startTime <= :dEnd",
        {
          dStart,
          dEnd,
        },
      );
    } else if (startDate && endDate) {
      qb.andWhere("schedule.startTime BETWEEN :start AND :end", {
        start: new Date(startDate),
        end: new Date(endDate),
      });
    }

    if (instructorId) {
      qb.andWhere("schedule.instructorId = :instructorId", { instructorId });
    }

    qb.orderBy("schedule.startTime", "ASC");
    const items = await qb.getMany();

    return items.map((s) => {
      const isBooked =
        userId && s.bookings
          ? s.bookings.some(
              (b) =>
                b.member?.userId === userId &&
                (b.status === BookingStatus.CONFIRMED ||
                  (b as any).status === "confirmed"),
            )
          : false;

      return {
        ...s,
        bookings: undefined,
        className: s.class?.name ?? "Lớp Pilates",
        instructor: {
          id: s.instructor?.id,
          fullName: s.instructor?.fullName ?? "HLV Pilates",
          avatarUrl: s.instructor?.avatarUrl,
        },
        room: s.room?.name ?? "Phòng tập",
        capacity: s.maxCapacity,
        enrolled: s.currentEnrolled,
        isBooked,
        scheduleStatus: s.status,
        status:
          s.status === ScheduleStatus.CANCELLED
            ? "cancelled"
            : s.currentEnrolled >= s.maxCapacity
              ? "full"
              : s.currentEnrolled >= s.maxCapacity - 2
                ? "nearly_full"
                : "available",
      };
    });
  }

  async findUpcoming(limit = 3, userId?: string) {
    const qb = this.schedulesRepository
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("schedule.instructor", "instructor")
      .leftJoinAndSelect("schedule.room", "room")
      .leftJoinAndSelect("schedule.bookings", "booking")
      .leftJoinAndSelect("booking.member", "member")
      .where("schedule.status = :status", { status: ScheduleStatus.SCHEDULED })
      .andWhere("schedule.startTime >= :now", { now: new Date() })
      .orderBy("schedule.startTime", "ASC")
      .take(limit);

    const schedules = await qb.getMany();

    return schedules.map((s) => {
      const isBooked =
        userId && s.bookings
          ? s.bookings.some(
              (b) =>
                b.member?.userId === userId &&
                (b.status === BookingStatus.CONFIRMED ||
                  (b as any).status === "confirmed"),
            )
          : false;

      return {
        id: s.id,
        className: s.class?.name ?? "Lớp Pilates",
        instructor: {
          id: s.instructor?.id,
          fullName: s.instructor?.fullName ?? "HLV Pilates",
          avatarUrl: s.instructor?.avatarUrl,
        },
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        room: s.room?.name ?? "Phòng tập",
        capacity: s.maxCapacity,
        enrolled: s.currentEnrolled,
        isBooked,
        status:
          s.currentEnrolled >= s.maxCapacity
            ? "full"
            : s.currentEnrolled >= s.maxCapacity - 2
              ? "nearly_full"
              : "available",
      };
    });
  }

  async findOneSchedule(id: string, user?: any) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id },
      relations: [
        "class",
        "instructor",
        "room",
        "bookings",
        "bookings.member",
        "bookings.member.user",
      ],
    });
    if (!schedule) throw new NotFoundException(`Schedule #${id} not found`);
    if (user?.role === UserRole.MEMBER)
      schedule.bookings = schedule.bookings.filter(
        (b) => b.member?.userId === user.id,
      );
    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto) {
    return this.schedulesRepository.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(ClassSchedule),
        privateRequests = manager.getRepository(PrivateSessionRequest);
      const cls = await manager
        .getRepository(Class)
        .findOneBy({ id: dto.classId, isActive: true });
      if (!cls)
        throw new NotFoundException(
          "Lớp không tồn tại hoặc đã ngừng hoạt động",
        );

      const coach = await manager
        .getRepository(User)
        .findOne({
          where: {
            id: dto.instructorId,
            role: UserRole.INSTRUCTOR,
            isActive: true,
          },
          lock: { mode: "pessimistic_write" },
        });
      const room = await manager
        .getRepository(Room)
        .findOne({
          where: { id: dto.roomId },
          lock: { mode: "pessimistic_write" },
        });
      const capacity = dto.maxCapacity ?? cls.defaultMaxCapacity;
      if (
        !room ||
        !room.isActive ||
        room.status !== "available" ||
        !coach ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > room.capacity
      )
        throw new BadRequestException(
          "Sức chứa, phòng tập hoặc HLV không hợp lệ",
        );
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        throw new BadRequestException(
          "Khung giờ bắt đầu và kết thúc không hợp lệ",
        );
      }

      // 1. Chống trùng phòng tập
      if (dto.roomId) {
        const conflictRoom = await schedules
          .createQueryBuilder("s")
          .where("s.roomId = :roomId", { roomId: dto.roomId })
          .andWhere("s.status != :cancelled", {
            cancelled: ScheduleStatus.CANCELLED,
          })
          .andWhere("s.startTime < :end AND s.endTime > :start", { start, end })
          .getOne();
        if (conflictRoom) {
          throw new BadRequestException(
            "Phòng tập này đã được xếp lịch lớp khác trong khung giờ đã chọn",
          );
        }
      }

      // 2. Chống trùng huấn luyện viên với lớp khác
      if (dto.instructorId) {
        const conflictInstructor = await schedules
          .createQueryBuilder("s")
          .where("s.instructorId = :instructorId", {
            instructorId: dto.instructorId,
          })
          .andWhere("s.status != :cancelled", {
            cancelled: ScheduleStatus.CANCELLED,
          })
          .andWhere("s.startTime < :end AND s.endTime > :start", { start, end })
          .getOne();
        if (conflictInstructor) {
          throw new BadRequestException(
            "Huấn luyện viên đã có lịch dạy lớp khác trong khung giờ này",
          );
        }

        // 3. Chống trùng huấn luyện viên với lịch tập riêng đã xác nhận
        const conflictPrivate = await privateRequests
          .createQueryBuilder("r")
          .where("r.instructorUserId = :instructorId", {
            instructorId: dto.instructorId,
          })
          .andWhere("r.status = :approved", {
            approved: PrivateSessionStatus.APPROVED,
          })
          .andWhere("r.startTime < :end AND r.endTime > :start", { start, end })
          .getOne();
        if (conflictPrivate) {
          throw new BadRequestException(
            "Huấn luyện viên đã có lịch tập riêng đã xác nhận trong khung giờ này",
          );
        }
      }

      const schedule = schedules.create({
        ...dto,
        startTime: start,
        endTime: end,
        maxCapacity: dto.maxCapacity || cls.defaultMaxCapacity,
        status: ScheduleStatus.SCHEDULED,
      });

      return schedules.save(schedule);
    });
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto, user?: any) {
    if (dto.status === ScheduleStatus.CANCELLED) {
      const current = await this.findOneSchedule(id);
      if (
        user?.role === UserRole.INSTRUCTOR &&
        current.instructorId !== user.id
      )
        throw new ForbiddenException("Bạn không có quyền sửa ca này");
      await this.cancelSchedule(id);
      return this.findOneSchedule(id);
    }
    await this.schedulesRepository.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(ClassSchedule),
        privateRequests = manager.getRepository(PrivateSessionRequest);
      const existingSchedule = await schedules.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!existingSchedule) throw new NotFoundException("Lịch không tồn tại");
      if (user?.role === UserRole.INSTRUCTOR) {
        if (existingSchedule.instructorId !== user.id)
          throw new ForbiddenException("Bạn không có quyền sửa ca này");
        if (Object.keys(dto).some((key) => key !== "status" && key !== "notes"))
          throw new ForbiddenException(
            "HLV chỉ được cập nhật trạng thái và ghi chú ca của mình",
          );
      }

      const start = dto.startTime
        ? new Date(dto.startTime)
        : existingSchedule.startTime;
      const end = dto.endTime
        ? new Date(dto.endTime)
        : existingSchedule.endTime;
      const roomId =
        dto.roomId !== undefined ? dto.roomId : existingSchedule.roomId;
      const instructorId =
        dto.instructorId !== undefined
          ? dto.instructorId
          : existingSchedule.instructorId;

      const coach = await manager
        .getRepository(User)
        .findOne({
          where: {
            id: instructorId,
            role: UserRole.INSTRUCTOR,
            isActive: true,
          },
          lock: { mode: "pessimistic_write" },
        });
      if (!coach) throw new BadRequestException("HLV không hợp lệ");
      const room = await manager
        .getRepository(Room)
        .findOne({
          where: { id: roomId },
          lock: { mode: "pessimistic_write" },
        });
      const capacity = dto.maxCapacity ?? existingSchedule.maxCapacity;
      if (
        !room ||
        !room.isActive ||
        room.status !== "available" ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > room.capacity ||
        capacity < existingSchedule.currentEnrolled
      )
        throw new BadRequestException("Sức chứa hoặc phòng tập không hợp lệ");

      const isTimingOrAssignmentModified = Boolean(
        dto.startTime || dto.endTime || dto.roomId || dto.instructorId,
      );

      if (isTimingOrAssignmentModified) {
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
          throw new BadRequestException(
            "Khung giờ bắt đầu và kết thúc không hợp lệ",
          );
        }

        // 1. Chống trùng phòng tập
        if (roomId) {
          const conflictRoom = await schedules
            .createQueryBuilder("s")
            .where("s.roomId = :roomId", { roomId })
            .andWhere("s.id != :id", { id })
            .andWhere("s.status != :cancelled", {
              cancelled: ScheduleStatus.CANCELLED,
            })
            .andWhere("s.startTime < :end AND s.endTime > :start", {
              start,
              end,
            })
            .getOne();
          if (conflictRoom) {
            throw new BadRequestException(
              "Phòng tập này đã được xếp lịch lớp khác trong khung giờ đã chọn",
            );
          }
        }

        // 2. Chống trùng huấn luyện viên với lớp khác
        if (instructorId) {
          const conflictInstructor = await schedules
            .createQueryBuilder("s")
            .where("s.instructorId = :instructorId", { instructorId })
            .andWhere("s.id != :id", { id })
            .andWhere("s.status != :cancelled", {
              cancelled: ScheduleStatus.CANCELLED,
            })
            .andWhere("s.startTime < :end AND s.endTime > :start", {
              start,
              end,
            })
            .getOne();
          if (conflictInstructor) {
            throw new BadRequestException(
              "Huấn luyện viên đã có lịch dạy lớp khác trong khung giờ này",
            );
          }

          // 3. Chống trùng huấn luyện viên với lịch tập riêng đã xác nhận
          const conflictPrivate = await privateRequests
            .createQueryBuilder("r")
            .where("r.instructorUserId = :instructorId", { instructorId })
            .andWhere("r.status = :approved", {
              approved: PrivateSessionStatus.APPROVED,
            })
            .andWhere("r.startTime < :end AND r.endTime > :start", {
              start,
              end,
            })
            .getOne();
          if (conflictPrivate) {
            throw new BadRequestException(
              "Huấn luyện viên đã có lịch tập riêng đã xác nhận trong khung giờ này",
            );
          }
        }
      }

      const updateData: any = { ...dto };
      if (dto.startTime) updateData.startTime = start;
      if (dto.endTime) updateData.endTime = end;

      await schedules.update(id, updateData);
    });
    return this.findOneSchedule(id);
  }

  async cancelSchedule(id: string) {
    await this.schedulesRepository.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(ClassSchedule),
        bookings = manager.getRepository(Booking);
      const schedule = await schedules.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!schedule) throw new NotFoundException("Lịch không tồn tại");
      if (schedule.status === ScheduleStatus.COMPLETED)
        throw new BadRequestException("Không thể hủy lớp đã hoàn tất");
      for (const booking of await bookings.find({
        where: { scheduleId: id },
      })) {
        if (
          ![BookingStatus.CONFIRMED, BookingStatus.WAITLISTED].includes(
            booking.status,
          )
        )
          continue;
        if (booking.sessionDeducted && booking.memberPackageId) {
          await manager
            .getRepository(MemberPackage)
            .increment({ id: booking.memberPackageId }, "remainingSessions", 1);
          booking.sessionDeducted = false;
        }
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancelReason = "Phòng tập hủy lớp";
        await bookings.save(booking);
      }
      schedule.status = ScheduleStatus.CANCELLED;
      schedule.currentEnrolled = 0;
      schedule.waitlistCount = 0;
      await schedules.save(schedule);
    });
    return {
      success: true,
      message: "Đã hủy lớp và hoàn buổi cho booking hợp lệ",
    };
  }

  async getScheduleSpots(id: string) {
    const schedule = await this.findOneSchedule(id);
    const bookedSpots = schedule.bookings
      .filter(
        (b) =>
          b.status === BookingStatus.CONFIRMED ||
          b.status === BookingStatus.ATTENDED,
      )
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
    const member = await this.membersRepository.findOneBy({ userId });
    if (!member) throw new NotFoundException("Hồ sơ học viên không tồn tại");
    let booking: Booking;
    try {
      booking = await this.bookingsService.create(
        { scheduleId, memberId: member.id },
        { id: userId, role: UserRole.MEMBER },
        false,
      );
    } catch (error) {
      if (error instanceof ConflictException)
        throw new BadRequestException(error.message);
      throw error;
    }
    const mp = await this.memberPackagesRepository.findOneBy({
      id: booking.memberPackageId,
    });
    return {
      success: true,
      message: "Đặt chỗ lớp học thành công!",
      bookingId: booking.id,
      remainingSessions: mp.remainingSessions,
    };
  }

  async cancelBookingForSchedule(scheduleId: string, userId: string) {
    const member = await this.membersRepository.findOneBy({ userId });
    if (!member) throw new NotFoundException("Hồ sơ học viên không tồn tại");
    const booking = await this.bookingsRepository.findOne({
      where: {
        scheduleId,
        memberId: member.id,
        status: BookingStatus.CONFIRMED,
      },
    });
    if (!booking)
      throw new NotFoundException("Không tìm thấy lịch đặt chỗ của bạn");
    const cancelled = await this.bookingsService.cancel(
      booking.id,
      {},
      { id: userId, role: UserRole.MEMBER },
    );
    return {
      success: true,
      message: cancelled.isLateCancel
        ? "Đã hủy lịch, hủy trễ không được hoàn buổi"
        : "Đã hủy lịch và hoàn buổi tập",
    };
  }
}
