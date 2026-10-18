import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Class } from "../../entities/class.entity";
import { ClassSchedule } from "../../entities/class-schedule.entity";
import { Member } from "../../entities/member.entity";
import { Booking } from "../../entities/booking.entity";
import { MemberPackage } from "../../entities/member-package.entity";
import { ClassesService } from "./classes.service";
import { ClassesController } from "./classes.controller";
import { BookingsModule } from "../bookings/bookings.module";

@Module({
  imports: [
    BookingsModule,
    TypeOrmModule.forFeature([
      Class,
      ClassSchedule,
      Member,
      Booking,
      MemberPackage,
    ]),
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
