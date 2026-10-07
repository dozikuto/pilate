import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutPlan } from '../../entities/workout-plan.entity';
import { ClassSchedule } from '../../entities/class-schedule.entity';
import { Booking } from '../../entities/booking.entity';
import { Member } from '../../entities/member.entity';
import { CreateWorkoutPlanDto, UpdateProgressDto } from './dto/teaching.dto';

@Injectable()
export class TeachingService {
  constructor(
    @InjectRepository(WorkoutPlan)
    private workoutPlansRepository: Repository<WorkoutPlan>,
    @InjectRepository(ClassSchedule)
    private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
  ) {}

  async getMySchedules(instructorUserId: string) {
    return this.schedulesRepository.find({
      where: { instructorId: instructorUserId },
      relations: ['class', 'room', 'bookings', 'bookings.member', 'bookings.member.user'],
      order: { startTime: 'ASC' },
    });
  }

  async getMyStudents(instructorUserId: string) {
    const bookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.schedule', 'schedule')
      .leftJoinAndSelect('booking.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('schedule.instructorId = :instructorUserId', { instructorUserId })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['confirmed', 'attended'] })
      .getMany();

    const uniqueMembersMap = new Map<string, any>();
    for (const b of bookings) {
      if (b.member && !uniqueMembersMap.has(b.member.id)) {
        uniqueMembersMap.set(b.member.id, {
          id: b.member.id,
          fullName: b.member.user?.fullName,
          phone: b.member.user?.phone,
          email: b.member.user?.email,
          healthNotes: b.member.healthNotes,
          goals: b.member.goals,
          totalSessionsAttended: b.member.totalSessionsAttended,
        });
      }
    }

    return Array.from(uniqueMembersMap.values());
  }

  async createWorkoutPlan(instructorUserId: string, dto: CreateWorkoutPlanDto) {
    const plan = this.workoutPlansRepository.create({
      memberId: dto.memberId,
      instructorId: instructorUserId,
      scheduleId: dto.scheduleId,
      title: dto.title,
      exercises: dto.exercises,
      progressNotes: dto.progressNotes,
      feedback: dto.feedback,
    });
    return this.workoutPlansRepository.save(plan);
  }

  async updateProgress(planId: string, dto: UpdateProgressDto) {
    const plan = await this.workoutPlansRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Workout plan #${planId} not found`);

    if (dto.progressNotes !== undefined) plan.progressNotes = dto.progressNotes;
    if (dto.feedback !== undefined) plan.feedback = dto.feedback;

    return this.workoutPlansRepository.save(plan);
  }

  async getMemberProgress(memberId: string) {
    return this.workoutPlansRepository.find({
      where: { memberId },
      relations: ['instructor', 'schedule', 'schedule.class'],
      order: { createdAt: 'DESC' },
    });
  }
}
