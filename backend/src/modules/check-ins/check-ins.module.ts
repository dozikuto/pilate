import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../../entities/check-in.entity';
import { Member } from '../../entities/member.entity';
import { Booking } from '../../entities/booking.entity';
import { MemberPackage } from '../../entities/member-package.entity';
import { PackagesModule } from '../packages/packages.module';
import { CheckInsService } from './check-ins.service';
import { CheckInsController } from './check-ins.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, Member, Booking, MemberPackage]),
    PackagesModule,
  ],
  controllers: [CheckInsController],
  providers: [CheckInsService],
  exports: [CheckInsService],
})
export class CheckInsModule {}
