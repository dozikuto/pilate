import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateSessionRequest } from '../../entities/private-session-request.entity';
import { ClassSchedule } from '../../entities/class-schedule.entity';
import { Instructor } from '../../entities/instructor.entity';
import { User } from '../../entities/user.entity';
import { Booking } from '../../entities/booking.entity';
import { Member } from '../../entities/member.entity';
import { PrivateSessionsService } from './private-sessions.service';
import { PrivateSessionsController } from './private-sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrivateSessionRequest,
      ClassSchedule,
      Instructor,
      User,
      Booking,
      Member,
    ]),
  ],
  controllers: [PrivateSessionsController],
  providers: [PrivateSessionsService],
})
export class PrivateSessionsModule {}
