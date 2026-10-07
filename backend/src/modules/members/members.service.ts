import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { Package } from '../../entities/package.entity';
import { Booking } from '../../entities/booking.entity';
import { CheckIn } from '../../entities/check-in.entity';
import { Transaction } from '../../entities/transaction.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Injectable()
export class MembersService {
  constructor(
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

  async findAll(pagination: PaginationDto) {
    const qb = this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberPackages', 'memberPackages')
      .leftJoinAndSelect('memberPackages.package', 'package');

    if (pagination.search) {
      qb.where(
        'user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search',
        { search: `%${pagination.search}%` },
      );
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy(`member.${pagination.sort || 'createdAt'}`, pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: [
        'user',
        'memberPackages',
        'memberPackages.package',
        'bookings',
        'bookings.schedule',
        'bookings.schedule.class',
        'bookings.schedule.instructor',
        'checkIns',
      ],
    });

    if (!member) {
      throw new NotFoundException(`Member #${id} not found`);
    }
    return member;
  }

  async findByUserId(userId: string) {
    const member = await this.membersRepository.findOne({
      where: { userId },
      relations: ['user', 'memberPackages', 'memberPackages.package'],
    });
    if (!member) {
      throw new NotFoundException(`Member with user ID ${userId} not found`);
    }
    return member;
  }

  async create(dto: CreateMemberDto) {
    const existingUser = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const defaultPassword = 'Member@123';
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

    if (dto.fullName || dto.phone) {
      await this.usersRepository.update(member.userId, {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone && { phone: dto.phone }),
      });
    }

    await this.membersRepository.update(id, {
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.emergencyContactName !== undefined && { emergencyContactName: dto.emergencyContactName }),
      ...(dto.emergencyContactPhone !== undefined && { emergencyContactPhone: dto.emergencyContactPhone }),
      ...(dto.healthNotes !== undefined && { healthNotes: dto.healthNotes }),
      ...(dto.goals !== undefined && { goals: dto.goals }),
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const member = await this.findOne(id);
    await this.usersRepository.update(member.userId, { isActive: false });
    return { success: true, message: 'Member deactivated successfully' };
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
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });

    return memberPackages.map((mp) => {
      const totalSessions = mp.package?.totalSessions ?? 10;
      const remainingSessions = mp.remainingSessions ?? 0;
      const expiryIso = mp.expiryDate ? new Date(mp.expiryDate).toISOString() : null;
      return {
        id: mp.id,
        memberId: mp.memberId,
        packageId: mp.packageId,
        packageName: mp.package?.name ?? 'Gói tập Pilates',
        packageType: mp.package?.type ?? 'session_based',
        package: {
          id: mp.package?.id ?? mp.packageId,
          name: mp.package?.name ?? 'Gói tập Pilates',
          description: mp.package?.description ?? 'Gói tập Pilates tiêu chuẩn',
          totalSessions,
          validDays: mp.package?.durationDays ?? 30,
          price: Number(mp.package?.price) || 0,
          category: mp.package?.type ?? 'session_based',
        },
        totalSessions,
        remainingSessions,
        usedSessions: Math.max(0, totalSessions - remainingSessions),
        startDate: mp.startDate ? new Date(mp.startDate).toISOString() : new Date().toISOString(),
        purchaseDate: mp.createdAt ? new Date(mp.createdAt).toISOString() : new Date().toISOString(),
        expiryDate: expiryIso,
        expiresAt: expiryIso,
        price: Number(mp.package?.price) || 0,
        status: mp.status,
      };
    });
  }

  async purchasePackage(
    userId: string,
    payload: string | { packageId: string; voucherCode?: string; paymentMethod?: PaymentMethod; discountAmount?: number; finalAmount?: number },
  ) {
    const packageId = typeof payload === 'string' ? payload : payload.packageId;
    const member = await this.findByUserId(userId);
    const pkg = await this.packagesRepository.findOne({ where: { id: packageId } });
    if (!pkg) {
      throw new NotFoundException('Gói tập không tồn tại');
    }

    const durationDays = pkg.durationDays || 30;
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const originalPrice = Number(pkg.price) || 0;
    const discount = typeof payload === 'object' && payload.discountAmount ? Number(payload.discountAmount) : 0;
    const finalAmount = typeof payload === 'object' && payload.finalAmount ? Number(payload.finalAmount) : Math.max(0, originalPrice - discount);
    const voucherCode = typeof payload === 'object' ? payload.voucherCode : null;
    const paymentMethod = typeof payload === 'object' && payload.paymentMethod ? payload.paymentMethod : PaymentMethod.BANK_TRANSFER;

    const transaction = this.transactionsRepository.create({
      memberId: member.id,
      amount: originalPrice,
      discountAmount: discount,
      finalAmount: finalAmount,
      paymentMethod,
      paymentStatus: PaymentStatus.COMPLETED,
      voucherCode: voucherCode || null,
      referenceCode: `PAY-${Date.now().toString(36).toUpperCase()}`,
      branchId: member.user?.branchId || 'f83678c4-a308-4119-9427-7a70de3a4b66',
      notes: `Thanh toán mua gói ${pkg.name}`,
    });
    const savedTx = await this.transactionsRepository.save(transaction);

    const memberPackage = this.memberPackagesRepository.create({
      memberId: member.id,
      packageId: pkg.id,
      transactionId: savedTx.id,
      remainingSessions: pkg.totalSessions ?? 10,
      startDate,
      expiryDate,
      status: MemberPackageStatus.ACTIVE,
    });

    const saved = await this.memberPackagesRepository.save(memberPackage);
    return {
      id: saved.id,
      packageName: pkg.name,
      remainingSessions: saved.remainingSessions,
      expiryDate: saved.expiryDate,
      status: saved.status,
      transactionId: savedTx.id,
      finalAmount,
      discountAmount: discount,
      voucherCode,
    };
  }

  async getMyStats(userId: string) {
    const member = await this.findByUserId(userId);
    const memberPackages = await this.memberPackagesRepository.find({
      where: { memberId: member.id, status: MemberPackageStatus.ACTIVE },
      relations: ['package'],
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

    const nextBooking = await this.bookingsRepository.findOne({
      where: {
        memberId: member.id,
        status: BookingStatus.CONFIRMED,
      },
      relations: ['schedule', 'schedule.class', 'schedule.instructor', 'schedule.room'],
      order: { bookedAt: 'DESC' },
    });

    return {
      remainingSessions,
      packageExpiresAt: latestExpiry,
      totalAttended: member.totalSessionsAttended || 0,
      nextClass: nextBooking?.schedule
        ? {
            id: nextBooking.schedule.id,
            className: nextBooking.schedule.class?.name ?? 'Lớp Pilates',
            startTime: new Date(nextBooking.schedule.startTime).toISOString(),
            endTime: new Date(nextBooking.schedule.endTime).toISOString(),
            instructorName: nextBooking.schedule.instructor?.fullName ?? 'HLV Pilates',
            room: nextBooking.schedule.room?.name ?? 'Phòng tập',
          }
        : null,
    };
  }

  async getMyAttendance(userId: string, limit = 5) {
    const member = await this.findByUserId(userId);
    const checkIns = await this.checkInsRepository.find({
      where: { memberId: member.id },
      relations: ['schedule', 'schedule.class', 'schedule.instructor'],
      order: { checkInTime: 'DESC' },
      take: limit,
    });

    return checkIns.map((ci) => ({
      id: ci.id,
      checkInTime: ci.checkInTime ? new Date(ci.checkInTime).toISOString() : new Date(ci.createdAt).toISOString(),
      method: ci.method,
      className: ci.schedule?.class?.name ?? 'Buổi tập Reformer',
      instructorName: ci.schedule?.instructor?.fullName ?? 'HLV PilatesMS',
    }));
  }
}
