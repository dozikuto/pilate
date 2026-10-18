import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";
import * as QRCode from "qrcode";
import { Member } from "../../entities/member.entity";
import { User } from "../../entities/user.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { CreateMemberDto, UpdateMemberDto } from "./dto/create-member.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import { Package } from "../../entities/package.entity";
import { Booking } from "../../entities/booking.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { Transaction } from "../../entities/transaction.entity";
import { BookingStatus } from "../../common/enums/booking-status.enum";
import { PaymentMethod } from "../../common/enums/payment-method.enum";
import { PaymentStatus } from "../../common/enums/payment-status.enum";
import { PromotionsService } from "../promotions/promotions.service";
import { Branch } from "../../entities/branch.entity";
import { MemberPackageSettingsService } from '../packages/member-package-settings.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly packageSettings: MemberPackageSettingsService,
    private readonly promotionsService: PromotionsService,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
    @InjectRepository(Package)
    private packagesRepository: Repository<Package>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(CheckIn)
    private checkInsRepository: Repository<CheckIn>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {}

  async findAll(pagination: PaginationDto, status?: string) {
    const qb = this.membersRepository
      .createQueryBuilder("member")
      .leftJoinAndSelect("member.user", "user")
      .leftJoinAndSelect("member.memberPackages", "memberPackages")
      .leftJoinAndSelect("memberPackages.package", "package");

    if (pagination.search) {
      qb.andWhere(
        "(user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)",
        { search: `%${pagination.search}%` },
      );
    }

    if (status === "inactive") {
      qb.andWhere("user.isActive = :isActive", { isActive: false });
    } else if (status === "active") {
      // Hoạt động: tài khoản mở và (có gói đang hoạt động HOẶC chưa mua gói nào)
      qb.andWhere("user.isActive = :isActive", { isActive: true });
      qb.andWhere(`(
        EXISTS (SELECT 1 FROM member_packages mp WHERE mp.member_id = member.id AND mp.status = 'active' AND (mp.expiry_date IS NULL OR mp.expiry_date >= CURRENT_DATE))
        OR NOT EXISTS (SELECT 1 FROM member_packages mp WHERE mp.member_id = member.id)
      )`);
    } else if (status === "expired") {
      // Hết hạn: tài khoản mở, đã từng mua gói nhưng không còn gói nào đang hoạt động
      qb.andWhere("user.isActive = :isActive", { isActive: true });
      qb.andWhere(
        `EXISTS (SELECT 1 FROM member_packages mp WHERE mp.member_id = member.id)`,
      );
      qb.andWhere(`NOT EXISTS (
        SELECT 1 FROM member_packages mp
        WHERE mp.member_id = member.id AND mp.status = 'active' AND (mp.expiry_date IS NULL OR mp.expiry_date >= CURRENT_DATE)
      )`);
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy(
        `member.${pagination.sort || "createdAt"}`,
        pagination.order || "DESC",
      );

    const [items, total] = await qb.getManyAndCount();

    const mappedItems = items.map((m) => {
      const activePackages =
        m.memberPackages?.filter(
          (p) =>
            p.status === MemberPackageStatus.ACTIVE &&
            (!p.expiryDate ||
              new Date(p.expiryDate).getTime() + 86400000 > Date.now()),
        ) || [];
      const latestPackage = m.memberPackages?.[0];
      const totalRemaining =
        m.memberPackages?.reduce(
          (sum, p) => sum + (p.remainingSessions || 0),
          0,
        ) || 0;
      const totalSessions =
        m.memberPackages?.reduce(
          (sum, p) => sum + (p.package?.totalSessions || 0),
          0,
        ) || (m.memberPackages && m.memberPackages.length > 0 ? 10 : 0);
      const usedSessions = Math.max(0, totalSessions - totalRemaining);

      const isMemberActive = m.user?.isActive !== false;
      const hasActivePkg = activePackages.length > 0;
      let memberStatus: "active" | "inactive" | "expired" = "active";

      if (!isMemberActive) {
        memberStatus = "inactive";
      } else if (
        m.memberPackages &&
        m.memberPackages.length > 0 &&
        !hasActivePkg
      ) {
        memberStatus = "expired";
      } else {
        memberStatus = "active";
      }

      return {
        id: m.id,
        code: m.qrCode || `HV${m.id.substring(0, 5).toUpperCase()}`,
        name: m.user?.fullName || "Học viên Pilates",
        phone: m.user?.phone || "",
        email: m.user?.email || "",
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        address: m.address,
        emergencyContact: m.emergencyContactName,
        emergencyPhone: m.emergencyContactPhone,
        healthNotes: m.healthNotes,
        goals: m.goals,
        joinDate: m.createdAt,
        status: memberStatus,
        totalSessions: totalSessions || 10,
        usedSessions: usedSessions,
        remainingSessions: totalRemaining,
        currentPackage: latestPackage
          ? {
              id: latestPackage.id,
              memberId: m.id,
              packageId: latestPackage.packageId,
              packageName: latestPackage.package?.name || "Gói tập Pilates",
              packageType: latestPackage.package?.type || "session",
              totalSessions: latestPackage.package?.totalSessions || 10,
              usedSessions: Math.max(
                0,
                (latestPackage.package?.totalSessions || 10) -
                  (latestPackage.remainingSessions || 0),
              ),
              remainingSessions: latestPackage.remainingSessions || 0,
              status: latestPackage.status,
            }
          : undefined,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        user: m.user,
      };
    });

    return paginate(mappedItems, total, pagination);
  }

  async findOne(id: string) {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: [
        "user",
        "memberPackages",
        "memberPackages.package",
        "bookings",
        "bookings.schedule",
        "bookings.schedule.class",
        "bookings.schedule.instructor",
        "checkIns",
        "checkIns.schedule",
        "checkIns.schedule.class",
      ],
    });

    if (!member) {
      throw new NotFoundException(`Member #${id} not found`);
    }
    return { ...member, memberPackages: await this.packageSettings.decorate(member.memberPackages) };
  }

  async findByUserId(userId: string) {
    const member = await this.membersRepository.findOne({
      where: { userId },
      relations: ["user", "memberPackages", "memberPackages.package"],
    });
    if (!member) {
      throw new NotFoundException(`Member with user ID ${userId} not found`);
    }
    return member;
  }

  async create(dto: CreateMemberDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const defaultPassword = "Member@123";
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      passwordHash,
      role: UserRole.MEMBER,
      branchId: dto.branchId,
    });
    const savedUser = await this.usersRepository.save(user);

    const member = this.membersRepository.create({
      userId: savedUser.id,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      address: dto.address,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      healthNotes: dto.healthNotes,
      goals: dto.goals,
      qrCode: `PILATES-${uuidv4().substring(0, 8).toUpperCase()}`,
    });

    const savedMember = await this.membersRepository.save(member);
    return this.findOne(savedMember.id);
  }

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.findOne(id);
    try {
      await this.membersRepository.manager.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const profile: Partial<Member> = {};
        const account: Partial<User> = {};
        if (dto.fullName !== undefined) account.fullName = dto.fullName;
        if (dto.phone !== undefined) account.phone = dto.phone;
        if (dto.email !== undefined) {
          const email = dto.email.trim().toLowerCase();
          const existing = await users.createQueryBuilder('u')
            .where('LOWER(u.email) = :email', { email })
            .andWhere('u.id != :userId', { userId: member.userId }).getOne();
          if (existing) throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
          account.email = email;
        }
        if (dto.dateOfBirth !== undefined) profile.dateOfBirth = dto.dateOfBirth === null ? null : new Date(dto.dateOfBirth);
        for (const key of ['gender', 'address', 'emergencyContactName', 'emergencyContactPhone', 'healthNotes', 'goals'] as const) {
          if (dto[key] !== undefined) profile[key] = dto[key];
        }
        const changed = Object.keys(account).length > 0 || Object.keys(profile).length > 0;
        if (Object.keys(account).length) await users.update(member.userId, { ...account, updatedAt: new Date() });
        if (changed) await manager.getRepository(Member).update(id, { ...profile, updatedAt: new Date() });
      });
    } catch (error) {
      if (error?.code === '23505') throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
      throw error;
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    const member = await this.findOne(id);
    await this.usersRepository.update(member.userId, { isActive: false });
    return { success: true, message: "Member deactivated successfully" };
  }

  async getQrCodeImage(id: string) {
    const member = await this.findOne(id);
    const qrData = JSON.stringify({
      memberId: member.id,
      code: member.qrCode,
      name: member.user.fullName,
    });
    const qrImage = await QRCode.toDataURL(qrData);
    return { qrCode: member.qrCode, qrImage };
  }

  async getMyPackages(userId: string) {
    const member = await this.findByUserId(userId);
    const memberPackages = await this.memberPackagesRepository.find({
      where: { memberId: member.id },
      relations: ["package"],
      order: { createdAt: "DESC" },
    });

    return (await this.packageSettings.decorate(memberPackages)).map((mp) => {
      const totalSessions = mp.package?.totalSessions ?? 10;
      const remainingSessions = mp.remainingSessions ?? 0;
      const expiryIso = mp.expiryDate
        ? new Date(mp.expiryDate).toISOString()
        : null;
      return {
        id: mp.id,
        memberId: mp.memberId,
        packageId: mp.packageId,
        packageName: mp.package?.name ?? "Gói tập Pilates",
        packageType: mp.package?.type ?? "session_based",
        package: {
          id: mp.package?.id ?? mp.packageId,
          name: mp.package?.name ?? "Gói tập Pilates",
          catalogCode: mp.package?.catalogCode,
          description: mp.package?.description ?? "Gói tập Pilates tiêu chuẩn",
          totalSessions,
          validDays: mp.package?.durationDays ?? 30,
          price: Number(mp.package?.price) || 0,
          category: mp.package?.type ?? "session_based",
          privateSessionEnabled: mp.package?.privateSessionEnabled ?? false,
          privateSessionType: mp.package?.privateSessionType,
          privateSessionDurationMinutes: mp.package?.privateSessionDurationMinutes,
        },
        totalSessions,
        remainingSessions,
        usedSessions: Math.max(0, totalSessions - remainingSessions),
        attendedSessions: mp.attendedSessions,
        reservedSessions: mp.reservedSessions,
        forfeitedSessions: mp.forfeitedSessions,
        otherUsedSessions: mp.otherUsedSessions,
        cancelHoursLimit: mp.cancelHoursLimit,
        preferredInstructorId: mp.preferredInstructorId,
        preferredInstructor: mp.preferredInstructor,
        duoPartnerPackageId: mp.duoPartnerPackageId,
        duoPartner: mp.duoPartner,
        startDate: mp.startDate
          ? new Date(mp.startDate).toISOString()
          : new Date().toISOString(),
        purchaseDate: mp.createdAt
          ? new Date(mp.createdAt).toISOString()
          : new Date().toISOString(),
        expiryDate: expiryIso,
        expiresAt: expiryIso,
        price: Number(mp.package?.price) || 0,
        status: mp.status,
      };
    });
  }

  async purchasePackage(
    userId: string,
    payload:
      | string
      | {
          packageId: string;
          voucherCode?: string;
          paymentMethod?: PaymentMethod;
          discountAmount?: number;
          finalAmount?: number;
        },
  ) {
    const packageId =
      typeof payload === "string" ? payload : payload?.packageId;
    if (!/^[a-f0-9-]{36}$/i.test(packageId || ""))
      throw new BadRequestException("Gói không hợp lệ");
    const member = await this.findByUserId(userId);
    const pkg = await this.packagesRepository.findOneBy({
      id: packageId,
      isActive: true,
    });
    if (!pkg)
      throw new NotFoundException(
        "Gói tập không tồn tại hoặc đã ngừng hoạt động",
      );
    const originalPrice = Number(pkg.price);
    const voucherCode =
      typeof payload === "object" ? payload.voucherCode : undefined;
    const promotion = voucherCode
      ? await this.promotionsService.applyPromotion({
          code: voucherCode,
          orderAmount: originalPrice,
        })
      : undefined;
    const discount = promotion?.discountAmount || 0;
    const finalAmount = promotion?.finalAmount ?? originalPrice;
    const paymentMethod =
      typeof payload === "object" && payload.paymentMethod
        ? payload.paymentMethod
        : PaymentMethod.BANK_TRANSFER;
    if (!Object.values(PaymentMethod).includes(paymentMethod))
      throw new BadRequestException("Phương thức thanh toán không hợp lệ");
    const branch = member.user.branchId
      ? { id: member.user.branchId }
      : await this.transactionsRepository.manager
          .getRepository(Branch)
          .findOneBy({ isActive: true });
    if (!branch) throw new BadRequestException("Chưa có chi nhánh hoạt động");
    const tx = await this.transactionsRepository.save(
      this.transactionsRepository.create({
        memberId: member.id,
        packageId: pkg.id,
        amount: originalPrice,
        discountAmount: discount,
        finalAmount,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        voucherCode: promotion?.code || null,
        referenceCode: "PAY-" + uuidv4(),
        branchId: branch.id,
        notes: "Chờ xác nhận thanh toán mua gói " + pkg.name,
      }),
    );
    // Browser requests cannot confirm money received; only staff/provider confirmation grants the package.
    return {
      id: tx.id,
      packageName: pkg.name,
      remainingSessions: 0,
      expiryDate: null,
      status: "pending",
      transactionId: tx.id,
      finalAmount,
      discountAmount: discount,
      voucherCode: promotion?.code || null,
    };
  }

  async getMyStats(userId: string) {
    const member = await this.findByUserId(userId);
    const memberPackages = await this.memberPackagesRepository.find({
      where: { memberId: member.id, status: MemberPackageStatus.ACTIVE },
      relations: ["package"],
    });

    const remainingSessions = memberPackages.reduce(
      (sum, p) => sum + (p.remainingSessions || 0),
      0,
    );

    let latestExpiry: string | null = null;
    for (const p of memberPackages) {
      if (p.expiryDate) {
        const pExp = new Date(p.expiryDate).toISOString();
        if (!latestExpiry || new Date(p.expiryDate) > new Date(latestExpiry)) {
          latestExpiry = pExp;
        }
      }
    }

    const nextBooking = await this.bookingsRepository
      .createQueryBuilder("booking")
      .innerJoinAndSelect("booking.schedule", "schedule")
      .leftJoinAndSelect("schedule.class", "class")
      .leftJoinAndSelect("schedule.instructor", "instructor")
      .leftJoinAndSelect("schedule.room", "room")
      .where("booking.memberId = :memberId", { memberId: member.id })
      .andWhere("booking.status = :status", { status: BookingStatus.CONFIRMED })
      .andWhere("schedule.status != :cancelled", { cancelled: "cancelled" })
      .andWhere("schedule.startTime >= :now", { now: new Date() })
      .orderBy("schedule.startTime", "ASC")
      .getOne();

    return {
      remainingSessions,
      packageExpiresAt: latestExpiry,
      totalAttended: member.totalSessionsAttended || 0,
      nextClass: nextBooking?.schedule
        ? {
            id: nextBooking.schedule.id,
            className: nextBooking.schedule.class?.name ?? "Lớp Pilates",
            startTime: new Date(nextBooking.schedule.startTime).toISOString(),
            endTime: new Date(nextBooking.schedule.endTime).toISOString(),
            instructorName:
              nextBooking.schedule.instructor?.fullName ?? "HLV Pilates",
            room: nextBooking.schedule.room?.name ?? "Phòng tập",
          }
        : null,
    };
  }

  async getMyAttendance(userId: string, limit = 5) {
    const member = await this.findByUserId(userId);
    const checkIns = await this.checkInsRepository.find({
      where: { memberId: member.id },
      relations: ["schedule", "schedule.class", "schedule.instructor"],
      order: { checkInTime: "DESC" },
      take: limit,
    });

    return checkIns.map((ci) => ({
      id: ci.id,
      checkInTime: ci.checkInTime
        ? new Date(ci.checkInTime).toISOString()
        : new Date(ci.createdAt).toISOString(),
      method: ci.method,
      className: ci.schedule?.class?.name ?? "Buổi tập Reformer",
      instructorName: ci.schedule?.instructor?.fullName ?? "HLV PilatesMS",
    }));
  }

  async updateProfileByUserId(userId: string, data: any) {
    const member = await this.findByUserId(userId);
    const updated = await this.update(member.id, {
      ...data,
      healthNotes: data.healthNotes !== undefined ? data.healthNotes : data.healthNote,
    });
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.user?.fullName,
      email: updated.user?.email,
      phone: updated.user?.phone,
      healthNote: updated.healthNotes,
      healthNotes: updated.healthNotes,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      address: updated.address,
      goals: updated.goals,
      emergencyContactName: updated.emergencyContactName,
      emergencyContactPhone: updated.emergencyContactPhone,
      qrCode: updated.qrCode,
    };
  }
}
