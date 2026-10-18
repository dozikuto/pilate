import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  Max,
  Matches,
} from "class-validator";
import { OmitType, PartialType } from "@nestjs/mapped-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClassLevel, ClassType } from "../../../entities/class.entity";
import { ScheduleStatus } from "../../../entities/class-schedule.entity";

export class CreateClassDto {
  @ApiPropertyOptional({ example: "uuid-branch" })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: "Reformer Fundamentals" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Lớp Pilates Reformer căn bản dành cho người mới bắt đầu",
  })
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
  @IsInt()
  @Min(1)
  @IsOptional()
  defaultMaxCapacity?: number;

  @ApiPropertyOptional({ example: 55 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}

export class CreateScheduleDto {
  @ApiProperty({ example: "uuid-class" })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: "uuid-instructor-user" })
  @IsUUID()
  @IsNotEmpty()
  instructorId: string;

  @ApiProperty({ example: "uuid-room" })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: "2026-09-25T09:00:00Z" })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: "2026-09-25T10:00:00Z" })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 8 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ example: "Nhớ mang vớ chống trượt" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}

export class UpdateClassDto extends PartialType(CreateClassDto) {}

export class CreateRecurringSchedulesDto extends OmitType(CreateScheduleDto, [
  "startTime",
  "endTime",
  "isRecurring",
] as const) {
  @ApiProperty({ example: "2026-10-20" })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @ApiProperty({ example: "2026-11-24" })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  @ApiProperty({
    example: [2, 6],
    description: "0 = Chủ nhật, 1–6 = Thứ 2–Thứ 7",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  @ApiProperty({ example: "09:00" })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @ApiProperty({ example: "10:00" })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
