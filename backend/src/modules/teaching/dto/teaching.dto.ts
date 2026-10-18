import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min, Max, Matches, IsDateString, MaxLength, ValidateIf } from 'class-validator';
import { PartialType, PickType } from '@nestjs/mapped-types';

export class TeachingQueryDto {
  @IsOptional() @IsUUID() instructorId?: string;
  @IsOptional() @IsUUID() memberId?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
}

export class CreateWorkoutPlanDto {
  @IsUUID() memberId: string;
  @ValidateIf((_object, value) => value !== undefined) @IsUUID() instructorId?: string;
  @IsOptional() @IsUUID() scheduleId?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(20000) exercises?: string;
  @IsOptional() @IsString() @MaxLength(10000) progressNotes?: string;
  @IsOptional() @IsString() @MaxLength(10000) feedback?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(1) @Max(10) coreScore?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(1) @Max(10) flexibilityScore?: number;
}

export class UpdateWorkoutPlanDto extends PartialType(CreateWorkoutPlanDto, { skipNullProperties: false }) {}
export class UpdateProgressDto extends PickType(CreateWorkoutPlanDto, ['progressNotes', 'feedback', 'coreScore', 'flexibilityScore'] as const) {}
export class TeachingCheckInDto {
  @IsUUID() memberId: string;
  @IsUUID() bookingId: string;
}
