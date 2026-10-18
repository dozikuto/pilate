import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString, IsIn, ValidateIf, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'nguyen.van.a@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsDateString({ strict: true })
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'female', enum: ['male', 'female', 'other'] })
  @IsIn(['male', 'female', 'other'])
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Trần Thị B' })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Đau lưng dưới nhẹ, tránh gập bụng quá sâu' })
  @IsString()
  @IsOptional()
  healthNotes?: string;

  @ApiPropertyOptional({ example: 'Cải thiện tư thế, giảm đau lưng, tăng dẻo dai' })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiPropertyOptional({ example: 'uuid-branch' })
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsDateString({ strict: true })
  @IsOptional()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsIn(['male', 'female', 'other'])
  @IsOptional()
  gender?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  healthNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  goals?: string;
}
