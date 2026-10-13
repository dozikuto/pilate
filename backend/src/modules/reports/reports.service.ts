import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual } from "typeorm";
import { Transaction } from "../../entities/transaction.entity";
import {
  ClassSchedule,
  ScheduleStatus,
} from "../../entities/class-schedule.entity";
import { Member } from "../../entities/member.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { PaymentStatus } from "../../common/enums/payment-status.enum";

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
      .createQueryBuilder("tx")
      .select("SUM(tx.finalAmount)", "total")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt >= :today AND tx.createdAt < :tomorrow", {
        today,
        tomorrow,
      })
      .getRawOne();
    const todayRevenue = parseFloat(todayRevenueRaw?.total || "0");

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
      .createQueryBuilder("tx")
      .select("TO_CHAR(tx.createdAt, 'DD/MM')", "date")
      .addSelect("SUM(tx.finalAmount)", "revenue")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt >= :sevenDaysAgo", { sevenDaysAgo })
      .groupBy("TO_CHAR(tx.createdAt, 'DD/MM')")
      .orderBy("MIN(tx.createdAt)", "ASC")
      .getRawMany();

    const upcomingClasses = await this.schedulesRepository.find({
      where: {
        startTime: MoreThanOrEqual(new Date()),
      },
      relations: ["class", "instructor", "room"],
      order: { startTime: "ASC" },
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
        revenue: parseFloat(r.revenue || "0"),
      })),
      upcomingClasses,
    };
  }

  async getRevenueReport(startDate?: string, endDate?: string) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const monthlyRevenue = await this.transactionsRepository
      .createQueryBuilder("tx")
      .select("TO_CHAR(tx.createdAt, 'MM/YYYY')", "month")
      .addSelect("SUM(tx.finalAmount)", "revenue")
      .addSelect("COUNT(tx.id)", "count")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt BETWEEN :start AND :end", { start, end })
      .groupBy("TO_CHAR(tx.createdAt, 'MM/YYYY')")
      .orderBy("MIN(tx.createdAt)", "ASC")
      .getRawMany();

    const totalRevenueRaw = await this.transactionsRepository
      .createQueryBuilder("tx")
      .select("SUM(tx.finalAmount)", "total")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt BETWEEN :start AND :end", { start, end })
      .getRawOne();

    return {
      totalRevenue: parseFloat(totalRevenueRaw?.total || "0"),
      monthlyRevenue: monthlyRevenue.map((m) => ({
        month: m.month,
        revenue: parseFloat(m.revenue || "0"),
        count: parseInt(m.count || "0", 10),
      })),
    };
  }

  async getMemberReport() {
    const totalMembers = await this.membersRepository.count();

    const genderDistribution = await this.membersRepository
      .createQueryBuilder("m")
      .select("m.gender", "gender")
      .addSelect("COUNT(m.id)", "count")
      .groupBy("m.gender")
      .getRawMany();

    return {
      totalMembers,
      genderDistribution,
    };
  }

  async getYearlyReport(yearStr?: string) {
    if (yearStr !== undefined && !/^\d{4}$/.test(yearStr))
      throw new BadRequestException("Năm báo cáo không hợp lệ");
    const year = Number(
      yearStr ||
        new Intl.DateTimeFormat("en", {
          year: "numeric",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date()),
    );
    if (year < 1000 || year > 9999)
      throw new BadRequestException("Năm báo cáo không hợp lệ");
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // 1. Doanh thu theo các tháng trong năm
    const monthlyRevenueRaw = await this.transactionsRepository
      .createQueryBuilder("tx")
      .select("EXTRACT(MONTH FROM tx.createdAt)", "month")
      .addSelect("SUM(tx.finalAmount)", "revenue")
      .addSelect("COUNT(tx.id)", "count")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt >= :startOfYear AND tx.createdAt <= :endOfYear", {
        startOfYear,
        endOfYear,
      })
      .groupBy("EXTRACT(MONTH FROM tx.createdAt)")
      .orderBy("EXTRACT(MONTH FROM tx.createdAt)", "ASC")
      .getRawMany();

    // 2. Học viên đăng ký mới theo các tháng trong năm
    const monthlyMembersRaw = await this.membersRepository
      .createQueryBuilder("m")
      .select("EXTRACT(MONTH FROM m.createdAt)", "month")
      .addSelect("COUNT(m.id)", "count")
      .where("m.createdAt >= :startOfYear AND m.createdAt <= :endOfYear", {
        startOfYear,
        endOfYear,
      })
      .groupBy("EXTRACT(MONTH FROM m.createdAt)")
      .getRawMany();

    // 3. Số ca học tổ chức theo các tháng trong năm
    const monthlyClassesRaw = await this.schedulesRepository
      .createQueryBuilder("s")
      .select("EXTRACT(MONTH FROM s.startTime)", "month")
      .addSelect("COUNT(s.id)", "count")
      .where("s.startTime >= :startOfYear AND s.startTime <= :endOfYear", {
        startOfYear,
        endOfYear,
      })
      .groupBy("EXTRACT(MONTH FROM s.startTime)")
      .getRawMany();

    const revMap = new Map<number, number>();
    for (const r of monthlyRevenueRaw) {
      revMap.set(parseInt(r.month, 10), parseFloat(r.revenue || "0"));
    }

    const memMap = new Map<number, number>();
    for (const m of monthlyMembersRaw) {
      memMap.set(parseInt(m.month, 10), parseInt(m.count || "0", 10));
    }

    const clsMap = new Map<number, number>();
    for (const c of monthlyClassesRaw) {
      clsMap.set(parseInt(c.month, 10), parseInt(c.count || "0", 10));
    }

    const monthlyData = [];
    for (let m = 1; m <= 12; m++) {
      const realRev = revMap.get(m);
      const realMem = memMap.get(m);
      const realCls = clsMap.get(m);

      const revenue = realRev ?? 0;
      const members = realMem ?? 0;
      const classes = realCls ?? 0;

      monthlyData.push({
        month: `T${m}`,
        revenue,
        members,
        classes,
      });
    }

    const totalYearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
    const totalNewMembers = monthlyData.reduce((sum, d) => sum + d.members, 0);
    const totalClassesCount = monthlyData.reduce(
      (sum, d) => sum + d.classes,
      0,
    );

    const manager = this.transactionsRepository.manager;
    const packageDistribution = await manager.query(
      `
      SELECT p.name, COUNT(mp.id)::int AS value FROM member_packages mp
      JOIN packages p ON p.id = mp.package_id
      WHERE mp.created_at >= $1 AND mp.created_at <= $2 GROUP BY p.name ORDER BY p.name`,
      [startOfYear, endOfYear],
    );
    const instructorPerformance = await manager.query(
      `
      SELECT u.full_name AS name,
        COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (s.end_time-s.start_time)))/3600 FROM class_schedules s WHERE s.instructor_id=u.id AND s.status!='cancelled' AND s.start_time >= $1 AND s.start_time <= $2),0)::float AS hours,
        (SELECT COUNT(DISTINCT b.member_id)::int FROM bookings b JOIN class_schedules s ON s.id=b.schedule_id WHERE s.instructor_id=u.id AND b.status IN ('confirmed','attended') AND s.start_time >= $1 AND s.start_time <= $2) AS students,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r."targetType"='instructor' AND r.target_id IN (u.id::text, i.id::text) AND r.created_at >= $1 AND r.created_at <= $2),0)::float AS rating,
        COALESCE((SELECT 100.0*COUNT(*) FILTER (WHERE b.status='attended')/NULLIF(COUNT(*),0) FROM bookings b JOIN class_schedules s ON s.id=b.schedule_id WHERE s.instructor_id=u.id AND b.status IN ('confirmed','attended','no_show') AND s.start_time >= $1 AND s.start_time <= $2),0)::float AS attendance
      FROM instructors i JOIN users u ON u.id=i.user_id WHERE u.is_active=true ORDER BY u.full_name`,
      [startOfYear, endOfYear],
    );
    const roomUtilization = await manager.query(
      `
      SELECT r.name, r.capacity,
        COALESCE(AVG(100.0*s.current_enrolled/NULLIF(s.max_capacity,0)),0)::float AS occupancy,
        COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time-s.start_time)))/3600,0)::float AS hours
      FROM rooms r LEFT JOIN class_schedules s ON s.room_id=r.id AND s.status!='cancelled' AND s.start_time >= $1 AND s.start_time <= $2
      WHERE r.is_active=true GROUP BY r.id ORDER BY r.name`,
      [startOfYear, endOfYear],
    );

    return {
      year,
      monthlyData,
      totalYearRevenue,
      totalNewMembers,
      totalClassesCount,
      packageDistribution,
      instructorPerformance,
      roomUtilization,
      growthRate: null,
    };
  }
}
