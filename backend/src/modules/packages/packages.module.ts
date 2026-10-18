import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from '../../entities/package.entity';
import { MemberPackage } from '../../entities/member-package.entity';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { MemberPackageSettingsService } from './member-package-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Package, MemberPackage])],
  controllers: [PackagesController],
  providers: [PackagesService, MemberPackageSettingsService],
  exports: [PackagesService, MemberPackageSettingsService],
})
export class PackagesModule {}
