import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewTargetType } from '../../entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService implements OnModuleInit {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
  ) {}

  async onModuleInit() {
    try {
      await this.reviewsRepository.query(
        `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT; ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;`,
      );
    } catch {}
  }

  async create(userId: string, dto: CreateReviewDto) {
    const review = this.reviewsRepository.create({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetName: dto.targetName,
      scheduleId: dto.scheduleId,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.reviewsRepository.save(review);
  }

  async replyToReview(id: string, replyText: string) {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    review.reply = replyText.trim();
    review.repliedAt = new Date();
    return this.reviewsRepository.save(review);
  }

  async findAll(pagination: PaginationDto, targetType?: ReviewTargetType, targetId?: string) {
    const qb = this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user');

    if (targetType) {
      qb.andWhere('review.targetType = :targetType', { targetType });
    }
    if (targetId) {
      qb.andWhere('review.targetId = :targetId', { targetId });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('review.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async getAverageRating(targetType: ReviewTargetType, targetId?: string) {
    const qb = this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .where('review.targetType = :targetType', { targetType });

    if (targetId) {
      qb.andWhere('review.targetId = :targetId', { targetId });
    }

    const result = await qb.getRawOne();
    const avg = parseFloat(result?.averageRating || '0');
    return {
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: parseInt(result?.totalReviews || '0', 10),
    };
  }
}
