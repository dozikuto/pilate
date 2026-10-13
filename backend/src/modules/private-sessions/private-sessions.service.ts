import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, MoreThan, Not, Repository } from "typeorm";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PrivateSessionRequest,
  PrivateSessionStatus,
  PrivateSessionType,
} from "../../entities/private-session-request.entity";
import {
  ClassSchedule,
  ScheduleStatus,
} from "../../entities/class-schedule.entity";
import { Instructor } from "../../entities/instructor.entity";
import { User } from "../../entities/user.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { Booking } from "../../entities/booking.entity";
import { Member } from "../../entities/member.entity";

export class CreatePrivateSessionDto {
  @ApiProperty()
  @IsUUID()
  instructorUserId: string;

  @ApiProperty({ example: "2026-10-15T09:00:00+07:00" })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: "2026-10-15T10:00:00+07:00" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ enum: PrivateSessionType })
  @IsOptional()
  @IsEnum(PrivateSessionType)
  sessionType?: PrivateSessionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePrivateSessionStatusDto {
  @ApiProperty({ enum: PrivateSessionStatus })
  @IsEnum(PrivateSessionStatus)
  status: PrivateSessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responseNote?: string;
}

const TZ = "+07:00";
const WORK_START_HOUR = 7;
const WORK_END_HOUR = 21;
const ACTIVE_REQUEST_STATUSES = [
  PrivateSessionStatus.PENDING,
  PrivateSessionStatus.APPROVED,
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayVN(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

@Injectable()
export class PrivateSessionsService {
  constructor(
    @InjectRepository(PrivateSessionRequest)
    private requestsRepository: Repository<PrivateSessionRequest>,
    @InjectRepository(ClassSchedule)
    private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Instructor)
    private instructorsRepository: Repository<Instructor>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
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

    const schedules = await this.schedulesRepository
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

    const requests = await this.requestsRepository.find({
      where: {
        instructorUserId,
        status: In(ACTIVE_REQUEST_STATUSES),
        startTime: LessThan(rangeEnd),
        endTime: MoreThan(rangeStart),
      },
    });

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

      const freeSlots = [] as any[];
      for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        const hh = String(h).padStart(2, "0");
        const nh = String(h + 1).padStart(2, "0");
        const slotStart = new Date(`${date}T${hh}:00:00${TZ}`);
        const slotEnd = new Date(`${date}T${nh}:00:00${TZ}`);
        if (slotStart <= now) continue;
        const busyByClass = schedules.some((s) =>
          overlaps(slotStart, slotEnd, s.startTime, s.endTime),
        );
        if (busyByClass) continue;
        const request = requests.find((r) =>
          overlaps(slotStart, slotEnd, r.startTime, r.endTime),
        );
        if (request && request.memberUserId !== currentUserId) continue;
        freeSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          label: `${hh}:00 - ${nh}:00`,
          myRequestStatus: request ? request.status : null,
        });
      }

      days.push({
        date,
        weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
        classes,
        freeSlots,
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
      workingHours: { start: WORK_START_HOUR, end: WORK_END_HOUR },
      days,
    };
  }

  async create(memberUserId: string, dto: CreatePrivateSessionDto) {
    const instructor = await this.usersRepository.findOne({
      where: { id: dto.instructorUserId, role: UserRole.INSTRUCTOR },
    });
    if (!instructor)
      throw new NotFoundException("Không tìm thấy huấn luyện viên");

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime
      ? new Date(dto.endTime)
      : new Date(startTime.getTime() + 60 * 60 * 1000);
    if (isNaN(startTime.getTime()) || endTime <= startTime) {
      throw new BadRequestException("Khung giờ không hợp lệ");
    }
    if (startTime <= new Date()) {
      throw new BadRequestException(
        "Không thể đề nghị khung giờ trong quá khứ",
      );
    }
    const localStart = new Date(startTime.getTime() + 7 * 3600000);
    const localEnd = new Date(endTime.getTime() + 7 * 3600000);
    const opening = new Date(localStart);
    opening.setUTCHours(WORK_START_HOUR, 0, 0, 0);
    const closing = new Date(localStart);
    closing.setUTCHours(WORK_END_HOUR, 0, 0, 0);
    if (localStart < opening || localEnd > closing) {
      throw new BadRequestException(
        "Khung giờ tập phải nằm trong giờ hoạt động 07:00–21:00",
      );
    }

    // 1. Chống trùng lịch dạy lớp của HLV
    const conflictClass = await this.schedulesRepository.findOne({
      where: {
        instructorId: dto.instructorUserId,
        status: Not(ScheduleStatus.CANCELLED),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });
    if (conflictClass) {
      throw new BadRequestException(
        "Huấn luyện viên đã có lịch dạy trong khung giờ này",
      );
    }

    // 2. Chống trùng đề nghị tập riêng khác của HLV (đang chờ duyệt hoặc đã duyệt)
    const conflictRequest = await this.requestsRepository.findOne({
      where: {
        instructorUserId: dto.instructorUserId,
        status: In(ACTIVE_REQUEST_STATUSES),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });
    if (conflictRequest) {
      throw new BadRequestException(
        conflictRequest.memberUserId === memberUserId
          ? "Bạn đã gửi đề nghị cho khung giờ này rồi"
          : "Khung giờ này đã có người đề nghị, vui lòng chọn giờ khác",
      );
    }

    // 3. Chống trùng lịch học của chính học viên (đã đặt lớp khác trong khung giờ này)
    const memberClassConflict = await this.schedulesRepository
      .createQueryBuilder("s")
      .innerJoin("s.bookings", "b")
      .innerJoin("b.member", "m")
      .where("m.userId = :memberUserId", { memberUserId })
      .andWhere("b.status = :confirmed", { confirmed: BookingStatus.CONFIRMED })
      .andWhere("s.status != :cancelled", {
        cancelled: ScheduleStatus.CANCELLED,
      })
      .andWhere("s.startTime < :endTime AND s.endTime > :startTime", {
        startTime,
        endTime,
      })
      .getOne();
    if (memberClassConflict) {
      throw new BadRequestException(
        "Bạn đã có lịch tham gia một lớp học khác trong khung giờ này",
      );
    }

    // 4. Chống trùng đề nghị tập riêng khác của chính học viên (đã gửi cho HLV khác)
    const memberPrivateConflict = await this.requestsRepository.findOne({
      where: {
        memberUserId,
        status: In(ACTIVE_REQUEST_STATUSES),
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      },
    });
    if (memberPrivateConflict) {
      throw new BadRequestException(
        "Bạn đã có một đề nghị tập riêng khác trong khung giờ này",
      );
    }

    const request = this.requestsRepository.create({
      memberUserId,
      instructorUserId: dto.instructorUserId,
      startTime,
      endTime,
      sessionType: dto.sessionType || PrivateSessionType.PRIVATE_1V1,
      note: dto.note || "",
      status: PrivateSessionStatus.PENDING,
    });
    const saved = await this.requestsRepository.save(request);
    return this.findOne(saved.id);
  }

  async findOne(id: string) {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: ["memberUser", "instructorUser"],
    });
    if (!request)
      throw new NotFoundException("Không tìm thấy đề nghị tập riêng");
    return this.serialize(request);
  }

  async findMine(memberUserId: string) {
    const items = await this.requestsRepository.find({
      where: { memberUserId },
      relations: ["instructorUser"],
      order: { startTime: "DESC" },
      take: 50,
    });
    return items.map((r) => this.serialize(r));
  }

  async findAll(
    query: { status?: PrivateSessionStatus; instructorUserId?: string },
    user: { id: string; role: UserRole },
  ) {
    const qb = this.requestsRepository
      .createQueryBuilder("request")
      .leftJoinAndSelect("request.memberUser", "memberUser")
      .leftJoinAndSelect("request.instructorUser", "instructorUser");

    if (user.role === UserRole.INSTRUCTOR) {
      qb.andWhere("request.instructorUserId = :uid", { uid: user.id });
    } else if (query.instructorUserId) {
      qb.andWhere("request.instructorUserId = :iid", {
        iid: query.instructorUserId,
      });
    }
    if (query.status) {
      qb.andWhere("request.status = :status", { status: query.status });
    }

    qb.orderBy("request.createdAt", "DESC");
    const items = await qb.getMany();
    return items.map((r) => this.serialize(r));
  }

  async updateStatus(
    id: string,
    dto: UpdatePrivateSessionStatusDto,
    user: { id: string; role: UserRole },
  ) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy đề nghị tập riêng");

    if (
      user.role === UserRole.INSTRUCTOR &&
      request.instructorUserId !== user.id
    ) {
      throw new ForbiddenException("Bạn không có quyền xử lý đề nghị này");
    }

    if (dto.status === PrivateSessionStatus.APPROVED) {
      // 1. Kiểm tra lại: Huấn luyện viên có bị trùng với lịch dạy lớp học nào không
      const conflictClass = await this.schedulesRepository.findOne({
        where: {
          instructorId: request.instructorUserId,
          status: Not(ScheduleStatus.CANCELLED),
          startTime: LessThan(request.endTime),
          endTime: MoreThan(request.startTime),
        },
      });
      if (conflictClass) {
        throw new BadRequestException(
          "Không thể duyệt: Huấn luyện viên đã có lịch dạy lớp trong khung giờ này",
        );
      }

      // 2. Kiểm tra lại: Huấn luyện viên có đề nghị khác ĐÃ DUYỆT trùng giờ không
      const conflictApproved = await this.requestsRepository.findOne({
        where: {
          id: Not(request.id),
          instructorUserId: request.instructorUserId,
          status: PrivateSessionStatus.APPROVED,
          startTime: LessThan(request.endTime),
          endTime: MoreThan(request.startTime),
        },
      });
      if (conflictApproved) {
        throw new BadRequestException(
          "Không thể duyệt: Khung giờ này đã được xác nhận cho một học viên khác",
        );
      }

      // 3. Tự động từ chối các đề nghị PENDING khác cùng khung giờ của HLV này
      const otherPending = await this.requestsRepository.find({
        where: {
          id: Not(request.id),
          instructorUserId: request.instructorUserId,
          status: PrivateSessionStatus.PENDING,
          startTime: LessThan(request.endTime),
          endTime: MoreThan(request.startTime),
        },
      });
      for (const op of otherPending) {
        op.status = PrivateSessionStatus.REJECTED;
        op.responseNote = "Khung giờ này đã được xác nhận cho học viên khác";
        await this.requestsRepository.save(op);
      }
    }

    request.status = dto.status;
    if (dto.responseNote !== undefined) request.responseNote = dto.responseNote;
    await this.requestsRepository.save(request);
    return this.findOne(id);
  }

  async cancelMine(id: string, memberUserId: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException("Không tìm thấy đề nghị tập riêng");
    if (request.memberUserId !== memberUserId) {
      throw new ForbiddenException("Bạn không có quyền hủy đề nghị này");
    }
    if (!ACTIVE_REQUEST_STATUSES.includes(request.status)) {
      throw new BadRequestException("Đề nghị này không thể hủy");
    }
    request.status = PrivateSessionStatus.CANCELLED;
    await this.requestsRepository.save(request);
    return this.findOne(id);
  }

  private serialize(r: PrivateSessionRequest) {
    return {
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      sessionType: r.sessionType,
      status: r.status,
      note: r.note,
      responseNote: r.responseNote,
      createdAt: r.createdAt,
      member: r.memberUser
        ? {
            userId: r.memberUser.id,
            fullName: r.memberUser.fullName,
            phone: r.memberUser.phone,
            email: r.memberUser.email,
          }
        : { userId: r.memberUserId },
      instructor: r.instructorUser
        ? {
            userId: r.instructorUser.id,
            fullName: r.instructorUser.fullName,
            avatarUrl: r.instructorUser.avatarUrl,
          }
        : { userId: r.instructorUserId },
    };
  }
}
