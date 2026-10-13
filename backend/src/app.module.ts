import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import configuration from './config/configuration';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MembersModule } from './modules/members/members.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { BranchesModule } from './modules/branches/branches.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { ClassesModule } from './modules/classes/classes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PackagesModule } from './modules/packages/packages.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TeachingModule } from './modules/teaching/teaching.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SystemModule } from './modules/system/system.module';
import { ProductsModule } from './modules/products/products.module';
import { PrivateSessionsModule } from './modules/private-sessions/private-sessions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),

    AuthModule,
    UsersModule,
    MembersModule,
    InstructorsModule,
    BranchesModule,
    EquipmentModule,
    ClassesModule,
    BookingsModule,
    PackagesModule,
    TransactionsModule,
    CheckInsModule,
    ReportsModule,
    ReviewsModule,
    TeachingModule,
    PromotionsModule,
    SystemModule,
    ProductsModule,
    PrivateSessionsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
