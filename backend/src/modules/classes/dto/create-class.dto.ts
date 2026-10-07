import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassLevel, ClassType } from '../../../entities/class.entity';
import { ScheduleStatus } from '../../../entities/class-schedule.entity';

export class CreateClassDto {
  @ApiProperty({ example: 'uuid-branch' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Reformer Fundamentals' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Lớp Pilates Reformer căn bản dành cho người mới bắt đầu' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ClassLevel, default: ClassLevel.BEGINNER })
  @IsEnum(ClassLevel)
  @IsOptional()
  level?: ClassLevel;

  @ApiPropertyOptional({ enum: ClassType, default: ClassType.GROUP })
  @IsEnum(ClassType)
  @IsOptional()
  type?: ClassType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultInstructorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultRoomId?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsOptional()
  defaultMaxCapacity?: number;

  @ApiPropertyOptional({ example: 55 })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsNumber()
  @IsOptional()
  price?: number;
}

export class CreateScheduleDto {
  @ApiProperty({ example: 'uuid-class' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'uuid-instructor-user' })
  @IsString()
  @IsNotEmpty()
  instructorId: string;

  @ApiProperty({ example: 'uuid-room' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: '2026-09-25T09:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-09-25T10:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 'Nhớ mang vớ chống trượt' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
