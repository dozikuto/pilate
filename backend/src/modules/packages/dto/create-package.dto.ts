import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackageType } from '../../../common/enums/package-type.enum';
import { MemberPackageStatus } from '../../../entities/member-package.entity';

export class CreatePackageDto {
  @ApiProperty({ example: 'Gói 10 Buổi Reformer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '10 buổi tập lớp nhóm Reformer, hạn dùng 60 ngày' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PackageType, default: PackageType.SESSION_BASED })
  @IsEnum(PackageType)
  type: PackageType;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  totalSessions?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @IsOptional()
  durationDays?: number;

  @ApiProperty({ example: 2500000 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isTransferable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class AssignPackageDto {
  @ApiProperty({ example: 'uuid-member' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'uuid-package' })
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @ApiPropertyOptional({ example: '2026-09-22' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transactionId?: string;
}
