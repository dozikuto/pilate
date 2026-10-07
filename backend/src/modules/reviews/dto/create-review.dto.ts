import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewTargetType } from '../../../entities/review.entity';

export class CreateReviewDto {
  @ApiProperty({ enum: ReviewTargetType, default: ReviewTargetType.SERVICE })
  @IsEnum(ReviewTargetType)
  targetType: ReviewTargetType;

  @ApiPropertyOptional({ example: 'uuid-instructor-or-member' })
  @IsString()
  @IsOptional()
  targetId?: string;

  @ApiPropertyOptional({ example: 'uuid-schedule' })
  @IsString()
  @IsOptional()
  scheduleId?: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Phòng tập sạch sẽ, máy Reformer rất êm, HLV hướng dẫn tận tình.' })
  @IsString()
  @IsOptional()
  comment?: string;
}
