import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WorkoutPlan } from '../../entities/workout-plan.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Booking } from '../../entities/booking.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { CheckIn } from '../../entities/check-in.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { CheckInsService } from '../check-ins/check-ins.service';
import { CreateWorkoutPlanDto, UpdateWorkoutPlanDto, TeachingQueryDto, TeachingCheckInDto } from './dto/teaching.dto';

@Injectable()
export class TeachingService {
  constructor(
    @InjectRepository(WorkoutPlan) private workoutPlansRepository: Repository<WorkoutPlan>,
    @InjectRepository(ClassSchedule) private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Booking) private bookingsRepository: Repository<Booking>,
    @InjectRepository(Member) private membersRepository: Repository<Member>,
    private readonly checkInsService: CheckInsService,
  ) {}

  private instructorFilter(user: any, requested?: string) {
    if (user.role === UserRole.INSTRUCTOR) {
      if (requested && requested !== user.id) throw new ForbiddenException('Bạn chỉ được xem dữ liệu giảng dạy của mình');
      return user.id;
    }
    return requested;
  }

  private async memberAccess(memberId: string, user: any) {
    if (!memberId) throw new BadRequestException('Vui lòng chọn học viên');
    const member = await this.membersRepository.findOneBy({ id: memberId });
    if (!member) throw new NotFoundException('Không tìm thấy học viên');
    if (user.role === UserRole.MEMBER) {
      if (member.userId !== user.id) throw new ForbiddenException('Bạn chỉ được xem tiến độ của mình');
    } else if (user.role === UserRole.INSTRUCTOR) {
      const assigned = await this.bookingsRepository.createQueryBuilder('b')
        .innerJoin('b.schedule', 's').where('b.memberId = :memberId', { memberId })
        .andWhere('s.instructorId = :id', { id: user.id })
        .andWhere('b.status IN (:...statuses)', { statuses: ['confirmed', 'attended'] }).getExists();
      const recorded = await this.workoutPlansRepository.existsBy({ memberId, instructorId: user.id });
      if (!assigned && !recorded) throw new ForbiddenException('Học viên chưa được phân công cho bạn');
    } else if (![UserRole.ADMIN, UserRole.RECEPTIONIST].includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền xem tiến độ');
    }
    return member;
  }

  async getSchedules(user: any, query: TeachingQueryDto = {}) {
    const instructorId = this.instructorFilter(user, query.instructorId);
    const qb = this.schedulesRepository.createQueryBuilder('s')
      .leftJoinAndSelect('s.class', 'class').leftJoinAndSelect('s.room', 'room')
      .leftJoinAndSelect('s.instructor', 'instructor').leftJoinAndSelect('s.bookings', 'booking')
      .leftJoinAndSelect('booking.member', 'member').leftJoinAndSelect('member.user', 'user')
      .where('s.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED });
    if (instructorId) qb.andWhere('s.instructorId = :instructorId', { instructorId });
    if (query.date) qb.andWhere('s.startTime >= :start AND s.startTime <= :end', {
      start: new Date(query.date + 'T00:00:00+07:00'), end: new Date(query.date + 'T23:59:59.999+07:00'),
    });
    const schedules = await qb.orderBy('s.startTime', 'ASC').addOrderBy('s.id', 'ASC').getMany();
    const checkIns = schedules.length ? await this.schedulesRepository.manager.getRepository(CheckIn)
      .find({ where: { scheduleId: In(schedules.map(s => s.id)) } }) : [];
    const checkInByBooking = new Map(checkIns.map(ci => [ci.bookingId, ci.checkInTime]));
    const nowMs = Date.now();
    return schedules.map(s => {
      const startMs = new Date(s.startTime).getTime();
      const endMs = new Date(s.endTime).getTime();
      let computedStatus = s.status;
      if (s.status !== ScheduleStatus.CANCELLED) {
        if (nowMs >= endMs) {
          computedStatus = ScheduleStatus.COMPLETED;
        } else if (nowMs >= startMs && nowMs < endMs) {
          computedStatus = ScheduleStatus.IN_PROGRESS;
        } else {
          computedStatus = ScheduleStatus.SCHEDULED;
        }
      }
      const students = s.bookings.filter(b => ['confirmed', 'attended'].includes(b.status)).map(b => ({
        bookingId: b.id, memberId: b.memberId, fullName: b.member?.user?.fullName ?? 'Học viên',
        phone: b.member?.user?.phone ?? '', email: b.member?.user?.email ?? '',
        healthNotes: b.member?.healthNotes ?? '', spotNumber: b.spotNumber, status: b.status,
        checkInTime: checkInByBooking.get(b.id) ?? null,
      }));
      return {
        id: s.id, instructorId: s.instructorId, instructorName: s.instructor?.fullName ?? '',
        className: s.class?.name ?? '', level: s.class?.level, roomId: s.roomId, roomName: s.room?.name ?? '',
        startTime: s.startTime, endTime: s.endTime, maxCapacity: s.maxCapacity,
        currentEnrolled: students.length, attendedCount: students.filter(b => b.status === 'attended').length,
        status: computedStatus, notes: s.notes ?? '', students,
      };
    });
  }

  async getStudents(user: any, query: TeachingQueryDto = {}) {
    const instructorId = this.instructorFilter(user, query.instructorId);
    const qb = this.membersRepository.createQueryBuilder('m').innerJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect('m.memberPackages', 'mp').leftJoinAndSelect('mp.package', 'p');
    if (instructorId) qb.andWhere("(EXISTS (SELECT 1 FROM bookings b JOIN class_schedules s ON s.id = b.schedule_id WHERE b.member_id = m.id AND b.status IN ('confirmed','attended') AND s.instructor_id = :instructorId) OR EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.member_id = m.id AND wp.instructor_id = :instructorId))", { instructorId });
    if (query.memberId) qb.andWhere('m.id = :memberId', { memberId: query.memberId });
    const members = await qb.orderBy('u.fullName', 'ASC').getMany();
    const plans = await this.getWorkoutPlans(user, query);
    return members.map(m => {
      const history = plans.filter(p => p.memberId === m.id);
      return {
        id: m.id, fullName: m.user.fullName, phone: m.user.phone ?? '', email: m.user.email,
        healthNotes: m.healthNotes ?? '', goals: m.goals ?? '', totalSessionsAttended: m.totalSessionsAttended,
        totalSessions: m.memberPackages.reduce((sum, mp) => sum + (mp.package?.totalSessions ?? 0), 0),
        lastProgress: history.find(p => p.progressNotes?.trim() || p.feedback?.trim()) ?? null,
        lastFeedback: history.find(p => !!p.feedback?.trim()) ?? null,
      };
    });
  }

  private presentPlan(plan: WorkoutPlan) {
    return {
      id: plan.id, memberId: plan.memberId, memberName: plan.member?.user?.fullName,
      instructorId: plan.instructorId, instructorName: plan.instructor?.fullName,
      scheduleId: plan.scheduleId, className: plan.schedule?.class?.name,
      scheduleStartTime: plan.schedule?.startTime,
      title: plan.title, exercises: plan.exercises ?? '', progressNotes: plan.progressNotes ?? '', feedback: plan.feedback ?? '',
      coreScore: plan.coreScore == null ? null : Number(plan.coreScore),
      flexibilityScore: plan.flexibilityScore == null ? null : Number(plan.flexibilityScore),
      createdAt: plan.createdAt, updatedAt: plan.updatedAt,
    };
  }

  async getWorkoutPlans(user: any, query: TeachingQueryDto = {}) {
    const instructorId = this.instructorFilter(user, query.instructorId);
    const qb = this.workoutPlansRepository.createQueryBuilder('p').leftJoinAndSelect('p.member', 'm')
      .leftJoinAndSelect('m.user', 'u').leftJoinAndSelect('p.instructor', 'i')
      .leftJoinAndSelect('p.schedule', 's').leftJoinAndSelect('s.class', 'c');
    if (instructorId) qb.andWhere('p.instructorId = :instructorId', { instructorId });
    if (query.memberId) qb.andWhere('p.memberId = :memberId', { memberId: query.memberId });
    return (await qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC').getMany()).map(p => this.presentPlan(p));
  }

  private async validateAssignment(user: any, dto: CreateWorkoutPlanDto) {
    await this.memberAccess(dto.memberId, user);
    const instructorId = dto.instructorId ?? user.id;
    if (user.role === UserRole.INSTRUCTOR && instructorId !== user.id)
      throw new ForbiddenException('Bạn chỉ được ghi giáo án của mình');
    const author = await this.workoutPlansRepository.manager.getRepository(User).findOneBy({ id: instructorId, isActive: true });
    if (!author || ![UserRole.INSTRUCTOR, UserRole.ADMIN].includes(author.role)) throw new BadRequestException('Người phụ trách không hợp lệ');
    if (typeof dto.title !== 'string' || !dto.title.trim()) throw new BadRequestException('Vui lòng nhập tên giáo án');
    if (dto.scheduleId) {
      const schedule = await this.schedulesRepository.findOneBy({ id: dto.scheduleId });
      if (!schedule) throw new NotFoundException('Không tìm thấy ca dạy');
      if (schedule.instructorId !== instructorId) throw new BadRequestException('Ca dạy không thuộc HLV đã chọn');
      if (!(await this.bookingsRepository.existsBy({ scheduleId: dto.scheduleId, memberId: dto.memberId, status: In(['confirmed', 'attended'] as any) })))
        throw new BadRequestException('Học viên chưa đăng ký ca dạy này');
    }
    return instructorId;
  }

  async createWorkoutPlan(user: any, dto: CreateWorkoutPlanDto) {
    const instructorId = await this.validateAssignment(user, dto);
    const plan = await this.workoutPlansRepository.save(this.workoutPlansRepository.create({
      ...dto, title: dto.title.trim(), instructorId, createdAt: new Date(), updatedAt: new Date(),
    }));
    return (await this.getWorkoutPlans(user, { memberId: plan.memberId })).find(p => p.id === plan.id);
  }

  async updateWorkoutPlan(id: string, user: any, dto: UpdateWorkoutPlanDto) {
    const plan = await this.workoutPlansRepository.findOneBy({ id });
    if (!plan) throw new NotFoundException('Không tìm thấy giáo án');
    if (user.role === UserRole.INSTRUCTOR && plan.instructorId !== user.id) throw new ForbiddenException('Bạn chỉ được sửa giáo án của mình');
    const merged = { ...plan, ...dto };
    await this.validateAssignment(user, merged);
    await this.workoutPlansRepository.update(id, { ...dto, title: merged.title.trim(), updatedAt: new Date() });
    return (await this.getWorkoutPlans(user, { memberId: merged.memberId })).find(p => p.id === id);
  }

  async getMemberProgress(memberId: string, user: any) {
    await this.memberAccess(memberId, user);
    const qb = this.workoutPlansRepository.createQueryBuilder('p').leftJoinAndSelect('p.member', 'm')
      .leftJoinAndSelect('m.user', 'u').leftJoinAndSelect('p.instructor', 'i')
      .leftJoinAndSelect('p.schedule', 's').leftJoinAndSelect('s.class', 'c')
      .where('p.memberId = :memberId', { memberId });
    return (await qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC').getMany()).map(p => this.presentPlan(p));
  }

  async checkIn(scheduleId: string, user: any, dto: TeachingCheckInDto) {
    return this.checkInsService.manualCheckIn({ ...dto, scheduleId }, user.id,
      user.role === UserRole.INSTRUCTOR ? user.id : undefined);
  }
}
