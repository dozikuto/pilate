import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus, EquipmentType } from '../../../common/enums/equipment-status.enum';

export class CreateEquipmentDto {
  @ApiPropertyOptional({ example: 'uuid-branch' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'Máy Reformer số 01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: EquipmentType, default: EquipmentType.REFORMER })
  @IsEnum(EquipmentType)
  type: EquipmentType;

  @ApiPropertyOptional({ enum: EquipmentStatus, default: EquipmentStatus.AVAILABLE })
  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @ApiPropertyOptional({ example: 'REF-2024-001' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional({ example: '2024-12-15' })
  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;
}

export class UpdateEquipmentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;
}
