import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInMethod } from '../../../entities/check-in.entity';

export class QrCheckInDto {
  @ApiProperty({ description: 'QR Code payload string from member app' })
  @IsString()
  @IsNotEmpty()
  qrData: string;

  @ApiPropertyOptional({ example: 'uuid-schedule' })
  @IsString()
  @IsOptional()
  scheduleId?: string;
}

export class ManualCheckInDto {
  @ApiProperty({ example: 'uuid-member' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ example: 'uuid-schedule' })
  @IsString()
  @IsOptional()
  scheduleId?: string;

  @ApiPropertyOptional({ example: 'uuid-booking' })
  @IsString()
  @IsOptional()
  bookingId?: string;
}
