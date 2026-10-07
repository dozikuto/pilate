import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'PILATES2026' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Ưu đãi Khai xuân 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Giảm 10% cho mọi gói tập trên 2 triệu' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 2000000 })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class ApplyPromotionDto {
  @ApiProperty({ example: 'PILATES2026' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 2800000 })
  @IsNumber()
  orderAmount: number;
}
