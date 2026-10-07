import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-schedule' })
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ example: 'uuid-member' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ example: 'uuid-member-package' })
  @IsString()
  @IsOptional()
  memberPackageId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  spotNumber?: number;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Bận việc đột xuất' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
