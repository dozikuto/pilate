import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../../entities/equipment.entity';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/create-equipment.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.equipmentRepository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.branch', 'branch');

    if (pagination.search) {
      qb.where('equipment.name ILIKE :search OR equipment.serialNumber ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('equipment.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Equipment #${id} not found`);
    }
    const eq = await this.equipmentRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!eq) throw new NotFoundException(`Equipment #${id} not found`);
    return eq;
  }

  async create(dto: CreateEquipmentDto) {
    if (!dto.branchId) {
      const branch = await this.equipmentRepository.manager.getRepository('Branch').findOne({ where: {} });
      if (branch) {
        dto.branchId = (branch as any).id;
      }
    }
    const eq = this.equipmentRepository.create({
      ...dto,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      lastMaintenanceDate: dto.lastMaintenanceDate ? new Date(dto.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : undefined,
    });
    return this.equipmentRepository.save(eq);
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id);
    await this.equipmentRepository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.status && { status: dto.status }),
      ...(dto.lastMaintenanceDate && { lastMaintenanceDate: new Date(dto.lastMaintenanceDate) }),
      ...(dto.nextMaintenanceDate && { nextMaintenanceDate: new Date(dto.nextMaintenanceDate) }),
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { success: true };
    }
    await this.findOne(id);
    await this.equipmentRepository.delete(id);
    return { success: true };
  }
}
