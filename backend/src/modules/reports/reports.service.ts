import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Member } from '../../entities/member.entity';
import { CheckIn } from '../../entities/check-in.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(ClassSchedule)
    private schedulesRepository: Repository<ClassSchedule>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    @InjectRepository(CheckIn)
    private checkInsRepository: Repository<CheckIn>,
  ) {}

  async getDashboardKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayRevenueRaw = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.finalAmount)', 'total')
      .where('tx.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('tx.createdAt >= :today AND tx.createdAt < :tomorrow', { today, tomorrow })
      .getRawOne();
    const todayRevenue = parseFloat(todayRevenueRaw?.total || '0');

    const todayClassesCount = await this.schedulesRepository.count({
      where: {
        startTime: Between(today, tomorrow),
      },
    });

    const newMembersCount = await this.membersRepository.count({
      where: {
        createdAt: MoreThanOrEqual(startOfMonth),
      },
    });

    const todayCheckInsCount = await this.checkInsRepository.count({
      where: {
        checkInTime: Between(today, tomorrow),
      },
    });

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const revenue7Days = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select("TO_CHAR(tx.createdAt, 'DD/MM')", 'date')
      .addSelect('SUM(tx.finalAmount)', 'revenue')
      .where('tx.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('tx.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .groupBy("TO_CHAR(tx.createdAt, 'DD/MM')")
      .orderBy("MIN(tx.createdAt)", 'ASC')
      .getRawMany();

    const upcomingClasses = await this.schedulesRepository.find({
      where: {
        startTime: MoreThanOrEqual(new Date()),
      },
      relations: ['class', 'instructor', 'room'],
      order: { startTime: 'ASC' },
      take: 5,
    });

    return {
      kpi: {
        todayRevenue,
        todayClassesCount,
        newMembersCount,
        todayCheckInsCount,
      },
      revenue7Days: revenue7Days.map((r) => ({
        date: r.date,
        revenue: parseFloat(r.revenue || '0'),
      })),
      upcomingClasses,
    };
  }

  async getRevenueReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const monthlyRevenue = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select("TO_CHAR(tx.createdAt, 'MM/YYYY')", 'month')
      .addSelect('SUM(tx.finalAmount)', 'revenue')
      .addSelect('COUNT(tx.id)', 'count')
      .where('tx.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('tx.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy("TO_CHAR(tx.createdAt, 'MM/YYYY')")
      .orderBy("MIN(tx.createdAt)", 'ASC')
      .getRawMany();

    const totalRevenueRaw = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.finalAmount)', 'total')
      .where('tx.paymentStatus = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('tx.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return {
      totalRevenue: parseFloat(totalRevenueRaw?.total || '0'),
      monthlyRevenue: monthlyRevenue.map((m) => ({
        month: m.month,
        revenue: parseFloat(m.revenue || '0'),
        count: parseInt(m.count || '0', 10),
      })),
    };
  }

  async getMemberReport() {
    const totalMembers = await this.membersRepository.count();

    const genderDistribution = await this.membersRepository
      .createQueryBuilder('m')
      .select('m.gender', 'gender')
      .addSelect('COUNT(m.id)', 'count')
      .groupBy('m.gender')
      .getRawMany();

    return {
      totalMembers,
      genderDistribution,
    };
  }
}
