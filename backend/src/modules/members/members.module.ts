import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Member } from "../../entities/member.entity";
import { User } from "../../entities/user.entity";
import { MemberPackage } from "../../entities/member-package.entity";
import { Package } from "../../entities/package.entity";
import { Booking } from "../../entities/booking.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { Transaction } from "../../entities/transaction.entity";
import { MembersService } from "./members.service";
import { MembersController } from "./members.controller";
import { PromotionsModule } from "../promotions/promotions.module";
import { PackagesModule } from '../packages/packages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      User,
      MemberPackage,
      Package,
      Booking,
      CheckIn,
      Transaction,
    ]),
    PromotionsModule,
    PackagesModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
