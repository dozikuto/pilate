import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../../entities/package.entity';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { CreatePackageDto, AssignPackageDto } from './dto/create-package.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packagesRepository: Repository<Package>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.packagesRepository.createQueryBuilder('package');

    if (pagination.search) {
      qb.where('package.name ILIKE :search', { search: `%${pagination.search}%` });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('package.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const pkg = await this.packagesRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException(`Package #${id} not found`);
    return pkg;
  }

  create(dto: CreatePackageDto) {
    const pkg = this.packagesRepository.create(dto);
    return this.packagesRepository.save(pkg);
  }

  async update(id: string, dto: Partial<CreatePackageDto>) {
    await this.findOne(id);
    await this.packagesRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.packagesRepository.update(id, { isActive: false });
    return { success: true };
  }

  async assignToMember(dto: AssignPackageDto) {
    const pkg = await this.findOne(dto.packageId);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    let expiryDate: Date | null = null;
    if (pkg.durationDays) {
      expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + pkg.durationDays);
    }

    const memberPackage = this.memberPackagesRepository.create({
      memberId: dto.memberId,
      packageId: dto.packageId,
      transactionId: dto.transactionId,
      remainingSessions: pkg.totalSessions || 0,
      startDate,
      expiryDate,
      status: MemberPackageStatus.ACTIVE,
    });

    return this.memberPackagesRepository.save(memberPackage);
  }

  async findMemberPackages(memberId: string) {
    return this.memberPackagesRepository.find({
      where: { memberId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
  }

  async deductSession(memberPackageId: string) {
    const mp = await this.memberPackagesRepository.findOne({ where: { id: memberPackageId } });
    if (!mp) throw new NotFoundException(`Member package #${memberPackageId} not found`);

    if (mp.remainingSessions > 0) {
      mp.remainingSessions -= 1;
      if (mp.remainingSessions === 0) {
        mp.status = MemberPackageStatus.EXPIRED;
      }
      await this.memberPackagesRepository.save(mp);
    }
    return mp;
  }
}
