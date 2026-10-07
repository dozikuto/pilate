import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory } from '../../../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Thảm tập Pilates Pro 10mm' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'SKU-PLT-001' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ enum: ProductCategory, default: ProductCategory.EQUIPMENT })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 'cái' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ example: 'https://example.com/mat.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Thảm TPE cao cấp chống trượt độ dày 10mm chuyên dụng cho Pilates' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductDto extends CreateProductDto {}
