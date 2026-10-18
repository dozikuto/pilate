import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutPlan } from '../../entities/workout-plan.entity';
import { ClassSchedule } from '../../entities/class-schedule.entity';
import { Booking } from '../../entities/booking.entity';
import { Member } from '../../entities/member.entity';
import { TeachingService } from './teaching.service';
import { TeachingController } from './teaching.controller';
import { CheckInsModule } from '../check-ins/check-ins.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutPlan, ClassSchedule, Booking, Member]), CheckInsModule],
  controllers: [TeachingController],
  providers: [TeachingService],
  exports: [TeachingService],
})
export class TeachingModule {}
