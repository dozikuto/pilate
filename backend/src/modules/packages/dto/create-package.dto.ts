import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { PackageType } from '../../../common/enums/package-type.enum';
import { PrivateSessionType } from '../../../common/enums/private-session-type.enum';
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

  @ApiPropertyOptional({ default: false, description: 'Gói tập riêng; false là gói tập lớp' })
  @IsOptional()
  @IsBoolean()
  privateSessionEnabled?: boolean;

  @ApiPropertyOptional({ enum: PrivateSessionType, default: PrivateSessionType.PRIVATE_1V1 })
  @IsOptional()
  @IsEnum(PrivateSessionType)
  privateSessionType?: PrivateSessionType;

  @ApiPropertyOptional({ default: 60, minimum: 15, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  privateSessionDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}

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
