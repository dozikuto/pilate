import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Product, ProductCategory } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(search?: string, category?: ProductCategory) {
    const where: FindOptionsWhere<Product> = { isActive: true };
    if (category) {
      where.category = category;
    }
    if (search) {
      where.name = Like(`%${search}%`);
    }

    const items = await this.productRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) {
      await this.seedDefaults();
      return this.productRepo.find({ order: { createdAt: 'DESC' } });
    }

    return items;
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: string, dto: Partial<UpdateProductDto>) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    product.isActive = false;
    return this.productRepo.save(product);
  }

  async updateStock(id: string, quantityChange: number) {
    const product = await this.findOne(id);
    product.stockQuantity = Math.max(0, Number(product.stockQuantity) + quantityChange);
    return this.productRepo.save(product);
  }

  private async seedDefaults() {
    const samples: Partial<Product>[] = [
      {
        name: 'Thảm Tập Pilates Pro Grip 10mm',
        sku: 'THAM-01',
        category: ProductCategory.EQUIPMENT,
        price: 450000,
        stockQuantity: 30,
        unit: 'chiếc',
        description: 'Thảm TPE cao cấp chống trượt độ bám cao, êm ái khi tập thảm và thiết bị',
        isActive: true,
      },
      {
        name: 'Vòng Tập Pilates Magic Circle 38cm',
        sku: 'VONG-01',
        category: ProductCategory.EQUIPMENT,
        price: 320000,
        stockQuantity: 20,
        unit: 'chiếc',
        description: 'Vòng kháng lực hỗ trợ siết cơ đùi, cơ bụng và bắp tay hiệu quả',
        isActive: true,
      },
      {
        name: 'Bóng Tập Pilates Mini Ball 25cm',
        sku: 'BONG-01',
        category: ProductCategory.EQUIPMENT,
        price: 180000,
        stockQuantity: 45,
        unit: 'quả',
        description: 'Bóng tập tăng cường cảm nhận cơ lõi và hỗ trợ thắt lưng',
        isActive: true,
      },
      {
        name: 'Tất Chống Trượt Pilates Grip Socks',
        sku: 'TAT-01',
        category: ProductCategory.ACCESSORY,
        price: 120000,
        stockQuantity: 60,
        unit: 'đôi',
        description: 'Tất dệt kim co giãn có hạt cao su chống trượt an toàn tuyệt đối trên máy Reformer',
        isActive: true,
      },
      {
        name: 'Bộ Quần Áo Tập Pilates Liền Thân Cao Cấp',
        sku: 'AO-01',
        category: ProductCategory.APPAREL,
        price: 680000,
        stockQuantity: 15,
        unit: 'bộ',
        description: 'Chất liệu Spandex co giãn 4 chiều thoáng khí ôm sát cơ thể',
        isActive: true,
      },
      {
        name: 'Nước Điện Giải Phục Hồi Cơ Electrolyte 500ml',
        sku: 'NUOC-01',
        category: ProductCategory.BEVERAGE,
        price: 35000,
        stockQuantity: 100,
        unit: 'chai',
        description: 'Bổ sung khoáng chất và điện giải nhanh chóng sau buổi tập cường độ cao',
        isActive: true,
      },
    ];

    for (const item of samples) {
      const p = this.productRepo.create(item);
      await this.productRepo.save(p);
    }
  }
}
