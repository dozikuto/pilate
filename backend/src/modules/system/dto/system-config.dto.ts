import {
  IsOptional,
  IsString,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MinLength,
} from "class-validator";

export class UpdateSystemConfigDto {
  @IsOptional() @IsString() @MinLength(1) studioName?: string;
  @IsOptional() @IsString() hotline?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() studioPhone?: string;
  @IsOptional() @IsEmail() studioEmail?: string;
  @IsOptional() @IsString() studioAddress?: string;
  @IsOptional() @IsInt() @Min(0) @Max(168) cancelHoursLimit?: number;
  @IsOptional() @IsBoolean() autoPromoteWaitlist?: boolean;
  @IsOptional() @IsBoolean() vietqrEnabled?: boolean;
}
