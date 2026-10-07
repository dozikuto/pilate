import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewTargetType } from '../../entities/review.entity';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a review/rating (UC1.8, R3.6)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'targetType', enum: ReviewTargetType, required: false })
  @ApiQuery({ name: 'targetId', required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('targetType') targetType?: ReviewTargetType,
    @Query('targetId') targetId?: string,
  ) {
    return this.reviewsService.findAll(pagination, targetType, targetId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get average rating summary' })
  @ApiQuery({ name: 'targetType', enum: ReviewTargetType, required: true })
  @ApiQuery({ name: 'targetId', required: false })
  getSummary(
    @Query('targetType') targetType: ReviewTargetType,
    @Query('targetId') targetId?: string,
  ) {
    return this.reviewsService.getAverageRating(targetType, targetId);
  }
}
