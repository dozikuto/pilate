import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Transaction } from "../../entities/transaction.entity";
import { Member } from "../../entities/member.entity";
import { PackagesService } from "../packages/packages.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { PaymentStatus } from "../../common/enums/payment-status.enum";
import { UserRole } from "../../common/enums/user-role.enum";
import { Package } from "../../entities/package.entity";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    private packagesService: PackagesService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    status?: PaymentStatus,
    memberId?: string,
    currentUser?: any,
  ) {
    const qb = this.transactionsRepository
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.member", "member")
      .leftJoinAndSelect("member.user", "user")
      .leftJoinAndSelect("tx.package", "package")
      .leftJoinAndSelect("tx.processor", "processor")
      .leftJoinAndSelect("tx.branch", "branch");

    if (currentUser?.role === UserRole.MEMBER) {
      const member = await this.membersRepository.findOne({
        where: { userId: currentUser.id },
      });
      if (!member) {
        return paginate([], 0, pagination);
      }
      qb.andWhere("tx.memberId = :memberId", { memberId: member.id });
    } else if (memberId) {
      qb.andWhere("tx.memberId = :memberId", { memberId });
    }

    if (status) qb.andWhere("tx.paymentStatus = :status", { status });
    if (pagination.search) {
      qb.andWhere(
        "tx.referenceCode ILIKE :search OR user.fullName ILIKE :search",
        {
          search: `%${pagination.search}%`,
        },
      );
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("tx.createdAt", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string, currentUser?: any) {
    const tx = await this.transactionsRepository.findOne({
      where: { id },
      relations: ["member", "member.user", "package", "processor", "branch"],
    });
    if (!tx) throw new NotFoundException(`Transaction #${id} not found`);
    if (
      currentUser?.role === UserRole.MEMBER &&
      tx.member?.userId !== currentUser.id
    )
      throw new ForbiddenException("Giao dịch không thuộc tài khoản của bạn");
    return tx;
  }

  async create(dto: CreateTransactionDto, processorId?: string) {
    if (
      dto.discountAmount > dto.amount ||
      Math.abs(dto.finalAmount - (dto.amount - (dto.discountAmount || 0))) >
        0.01
    )
      throw new BadRequestException("Số tiền thanh toán không hợp lệ");
    const id = await this.transactionsRepository.manager.transaction(
      async (manager) => {
        const pkg = dto.packageId
          ? await manager
              .getRepository(Package)
              .findOneBy({ id: dto.packageId, isActive: true })
          : undefined;
        if (dto.packageId && !pkg)
          throw new BadRequestException(
            "Gói không tồn tại hoặc đã ngừng hoạt động",
          );
        if (
          !(await manager.getRepository(Member).findOneBy({ id: dto.memberId }))
        )
          throw new NotFoundException("Học viên không tồn tại");
        const transactions = manager.getRepository(Transaction);
        const tx = await transactions.save(
          transactions.create({
            memberId: dto.memberId,
            packageId: dto.packageId,
            amount: dto.amount,
            discountAmount: dto.discountAmount || 0,
            finalAmount: dto.finalAmount,
            paymentMethod: dto.paymentMethod,
            paymentStatus: dto.paymentStatus || PaymentStatus.COMPLETED,
            referenceCode: dto.referenceCode || "TX-" + randomUUID(),
            voucherCode: dto.voucherCode,
            notes: dto.notes,
            branchId: dto.branchId,
            processedBy: processorId,
          }),
        );
        if (pkg && tx.paymentStatus === PaymentStatus.COMPLETED) {
          await manager
            .getRepository(MemberPackage)
            .save({
              memberId: dto.memberId,
              packageId: pkg.id,
              transactionId: tx.id,
              remainingSessions: pkg.totalSessions || 0,
              startDate: new Date(),
              expiryDate: pkg.durationDays
                ? new Date(Date.now() + pkg.durationDays * 86400000)
                : null,
              status: MemberPackageStatus.ACTIVE,
            });
        }
        return tx.id;
      },
    );
    return this.findOne(id);
  }

  async confirmPayment(
    id: string,
    referenceCode?: string,
    processedBy?: string,
  ) {
    await this.transactionsRepository.manager.transaction(async (manager) => {
      const tx = await manager
        .getRepository(Transaction)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!tx) throw new NotFoundException("Giao dịch không tồn tại");
      if (tx.paymentStatus === PaymentStatus.COMPLETED) return;
      if (tx.paymentStatus !== PaymentStatus.PENDING)
        throw new BadRequestException("Giao dịch không ở trạng thái chờ");
      if (
        tx.packageId &&
        !(await manager
          .getRepository(MemberPackage)
          .findOneBy({ transactionId: tx.id }))
      ) {
        const pkg = await manager
          .getRepository(Package)
          .findOneBy({ id: tx.packageId });
        if (!pkg) throw new BadRequestException("Gói tập không tồn tại");
        const startDate = new Date(),
          expiryDate = pkg.durationDays
            ? new Date(Date.now() + pkg.durationDays * 86400000)
            : null;
        await manager
          .getRepository(MemberPackage)
          .save({
            memberId: tx.memberId,
            packageId: pkg.id,
            transactionId: tx.id,
            remainingSessions: pkg.totalSessions || 0,
            startDate,
            expiryDate,
            status: MemberPackageStatus.ACTIVE,
          });
      }
      tx.paymentStatus = PaymentStatus.COMPLETED;
      if (referenceCode) tx.referenceCode = referenceCode;
      if (processedBy) tx.processedBy = processedBy;
      await manager.getRepository(Transaction).save(tx);
    });
    return this.findOne(id);
  }

  async getRevenueStats(startDate?: string, endDate?: string) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const qb = this.transactionsRepository
      .createQueryBuilder("tx")
      .select("SUM(tx.finalAmount)", "totalRevenue")
      .addSelect("COUNT(tx.id)", "totalTransactions")
      .where("tx.paymentStatus = :status", { status: PaymentStatus.COMPLETED })
      .andWhere("tx.createdAt BETWEEN :start AND :end", { start, end });

    const result = await qb.getRawOne();
    return {
      totalRevenue: parseFloat(result.totalRevenue || "0"),
      totalTransactions: parseInt(result.totalTransactions || "0", 10),
      startDate: start,
      endDate: end,
    };
  }
}
