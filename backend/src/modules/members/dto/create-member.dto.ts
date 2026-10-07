import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'nguyen.van.a@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'female', enum: ['male', 'female', 'other'] })
  @IsString()
  @IsOptional()
  gender?: string;

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
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

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
