import { IsEmail, IsNotEmpty, IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstructorDto {
  @ApiProperty({ example: 'le.thi.c@pilatesms.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Lê Thị C' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '0908765432' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '5 năm kinh nghiệm giảng dạy Pilates Reformer & Matwork' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'PMA Certified, STOTT Pilates Certified Instructor' })
  @IsString()
  @IsOptional()
  certifications?: string;

  @ApiPropertyOptional({ example: ['Reformer', 'Mat', 'Cadillac', 'Phục hồi chức năng'] })
  @IsArray()
  @IsOptional()
  specializations?: string[];

  @ApiPropertyOptional({ example: 350000 })
  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateInstructorDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certifications?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  specializations?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  commissionRate?: number;
}
