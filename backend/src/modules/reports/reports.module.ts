import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { ClassSchedule } from '../../entities/class-schedule.entity';
import { Member } from '../../entities/member.entity';
import { CheckIn } from '../../entities/check-in.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, ClassSchedule, Member, CheckIn])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
