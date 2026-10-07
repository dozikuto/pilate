import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';
import { CreatePromotionDto, ApplyPromotionDto } from './dto/promotion.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionsRepository: Repository<Promotion>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.promotionsRepository.createQueryBuilder('p');

    if (pagination.search) {
      qb.where('p.code ILIKE :search OR p.name ILIKE :search', { search: `%${pagination.search}%` });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('p.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const promo = await this.promotionsRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promotion #${id} not found`);
    return promo;
  }

  async create(dto: CreatePromotionDto) {
    const existing = await this.promotionsRepository.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new ConflictException(`Mã khuyến mãi ${dto.code} đã tồn tại`);

    const promo = this.promotionsRepository.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description,
      discountPercent: dto.discountPercent || 0,
      discountAmount: dto.discountAmount || 0,
      minOrderAmount: dto.minOrderAmount || 0,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      isActive: true,
    });
    return this.promotionsRepository.save(promo);
  }

  async applyPromotion(dto: ApplyPromotionDto) {
    const promo = await this.promotionsRepository.findOne({
      where: { code: dto.code.toUpperCase(), isActive: true },
    });
    if (!promo) {
      throw new NotFoundException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
    }

    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
      throw new BadRequestException('Chương trình khuyến mãi chưa bắt đầu');
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      throw new BadRequestException('Chương trình khuyến mãi đã kết thúc');
    }

    if (promo.minOrderAmount && dto.orderAmount < Number(promo.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${promo.minOrderAmount.toLocaleString('vi-VN')} VNĐ để áp dụng mã`,
      );
    }

    let calculatedDiscount = 0;
    if (promo.discountPercent > 0) {
      calculatedDiscount = (dto.orderAmount * Number(promo.discountPercent)) / 100;
    } else if (promo.discountAmount > 0) {
      calculatedDiscount = Number(promo.discountAmount);
    }

    const finalAmount = Math.max(0, dto.orderAmount - calculatedDiscount);

    return {
      success: true,
      code: promo.code,
      name: promo.name,
      originalAmount: dto.orderAmount,
      discountAmount: calculatedDiscount,
      finalAmount,
    };
  }

  async toggleActive(id: string) {
    const promo = await this.findOne(id);
    promo.isActive = !promo.isActive;
    return this.promotionsRepository.save(promo);
  }

  async remove(id: string) {
    const promo = await this.findOne(id);
    await this.promotionsRepository.remove(promo);
    return { success: true, message: 'Đã xóa mã khuyến mãi' };
  }
}
