import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { Member } from '../../entities/member.entity';
import { PackagesService } from '../packages/packages.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    private packagesService: PackagesService,
  ) {}

  async findAll(pagination: PaginationDto, status?: PaymentStatus, memberId?: string, currentUser?: any) {
    const qb = this.transactionsRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('tx.processor', 'processor')
      .leftJoinAndSelect('tx.branch', 'branch');

    if (currentUser?.role === UserRole.MEMBER) {
      const member = await this.membersRepository.findOne({ where: { userId: currentUser.id } });
      if (!member) {
        return paginate([], 0, pagination);
      }
      qb.andWhere('tx.memberId = :memberId', { memberId: member.id });
    } else if (memberId) {
      qb.andWhere('tx.memberId = :memberId', { memberId });
    }

    if (status) qb.andWhere('tx.paymentStatus = :status', { status });
    if (pagination.search) {
      qb.andWhere('tx.referenceCode ILIKE :search OR user.fullName ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('tx.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const tx = await this.transactionsRepository.findOne({
      where: { id },
      relations: ['member', 'member.user', 'processor', 'branch'],
    });
    if (!tx) throw new NotFoundException(`Transaction #${id} not found`);
    return tx;
  }

  async create(dto: CreateTransactionDto, processorId?: string) {
    const tx = this.transactionsRepository.create({
      memberId: dto.memberId,
      amount: dto.amount,
      discountAmount: dto.discountAmount || 0,
      finalAmount: dto.finalAmount,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus || PaymentStatus.COMPLETED,
      referenceCode: dto.referenceCode || `TX-${Date.now()}`,
      voucherCode: dto.voucherCode,
      notes: dto.notes,
      branchId: dto.branchId,
      processedBy: processorId,
    });

    const savedTx = await this.transactionsRepository.save(tx);

    if (dto.packageId && (savedTx.paymentStatus === PaymentStatus.COMPLETED)) {
      await this.packagesService.assignToMember({
        memberId: dto.memberId,
        packageId: dto.packageId,
        transactionId: savedTx.id,
      });
    }

    return this.findOne(savedTx.id);
  }

  async confirmPayment(id: string, referenceCode?: string) {
    const tx = await this.findOne(id);
    await this.transactionsRepository.update(id, {
      paymentStatus: PaymentStatus.COMPLETED,
      ...(referenceCode && { referenceCode }),
    });
    return this.findOne(id);
  }

  async getRevenueStats(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const qb = this.transactionsRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.finalAmount)', 'totalRevenue')
      .addSelect('COUNT(tx.id)', 'totalTransactions')
      .where('tx.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('tx.createdAt BETWEEN :start AND :end', { start, end });

    const result = await qb.getRawOne();
    return {
      totalRevenue: parseFloat(result.totalRevenue || '0'),
      totalTransactions: parseInt(result.totalTransactions || '0', 10),
      startDate: start,
      endDate: end,
    };
  }
}
