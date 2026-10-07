import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { Member } from '../../entities/member.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Branch } from '../../entities/branch.entity';
import { Room } from '../../entities/room.entity';
import { Equipment } from '../../entities/equipment.entity';
import { Class, ClassLevel, ClassType } from '../../entities/class.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Package } from '../../entities/package.entity';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Booking } from '../../entities/booking.entity';
import { CheckIn, CheckInMethod } from '../../entities/check-in.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { EquipmentType, EquipmentStatus } from '../../common/enums/equipment-status.enum';
import { PackageType } from '../../common/enums/package-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Promotion } from '../../entities/promotion.entity';
import { Review, ReviewTargetType } from '../../entities/review.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'pilates',
  password: process.env.DB_PASSWORD || 'pilates123',
  database: process.env.DB_NAME || 'pilatesms',
  entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
  synchronize: true,
});

async function runSeeds() {
  console.log('🌱 Connecting to database for seeding...');
  await AppDataSource.initialize();
  console.log('✅ Connected.');

  const userRepo = AppDataSource.getRepository(User);
  const branchRepo = AppDataSource.getRepository(Branch);
  const roomRepo = AppDataSource.getRepository(Room);
  const memberRepo = AppDataSource.getRepository(Member);
  const instructorRepo = AppDataSource.getRepository(Instructor);
  const equipmentRepo = AppDataSource.getRepository(Equipment);
  const classRepo = AppDataSource.getRepository(Class);
  const scheduleRepo = AppDataSource.getRepository(ClassSchedule);
  const packageRepo = AppDataSource.getRepository(Package);
  const memberPackageRepo = AppDataSource.getRepository(MemberPackage);
  const txRepo = AppDataSource.getRepository(Transaction);

  console.log('📍 Seeding Branch & Rooms...');
  let branch = await branchRepo.findOne({ where: { name: 'PilatesMS Central - Quận 1' } });
  if (!branch) {
    branch = branchRepo.create({
      name: 'PilatesMS Central - Quận 1',
      address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      phone: '028 3812 3456',
      email: 'central@pilatesms.vn',
      isActive: true,
    });
    branch = await branchRepo.save(branch);

    const room1 = roomRepo.create({
      branchId: branch.id,
      name: 'Phòng Reformer Studio',
      capacity: 8,
      description: 'Phòng tập nhóm với 8 máy Allegro 2 Reformer hiện đại',
    });
    const room2 = roomRepo.create({
      branchId: branch.id,
      name: 'Phòng VIP Private & Cadillac',
      capacity: 2,
      description: 'Phòng tập 1:1 hoặc 1:2 với Cadillac & Wunda Chair cao cấp',
    });
    await roomRepo.save([room1, room2]);
  }

  const rooms = await roomRepo.find({ where: { branchId: branch.id } });

  console.log('👤 Seeding Users...');
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  let admin = await userRepo.findOne({ where: { email: 'admin@pilatesms.vn' } });
  if (!admin) {
    admin = userRepo.create({
      email: 'admin@pilatesms.vn',
      fullName: 'Quản Trị Viên',
      phone: '0909111222',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      branchId: branch.id,
      isActive: true,
    });
    await userRepo.save(admin);
  }

  let receptionist = await userRepo.findOne({ where: { email: 'letan@pilatesms.vn' } });
  if (!receptionist) {
    receptionist = userRepo.create({
      email: 'letan@pilatesms.vn',
      fullName: 'Nguyễn Lễ Tân',
      phone: '0909222333',
      passwordHash: await bcrypt.hash('Staff@123', 12),
      role: UserRole.RECEPTIONIST,
      branchId: branch.id,
      isActive: true,
    });
    await userRepo.save(receptionist);
  }

  const coachPassword = await bcrypt.hash('Coach@123', 12);
  let coach1User = await userRepo.findOne({ where: { email: 'coach.lan@pilatesms.vn' } });
  if (!coach1User) {
    coach1User = await userRepo.save(
      userRepo.create({
        email: 'coach.lan@pilatesms.vn',
        fullName: 'Trần Mai Lan',
        phone: '0909333444',
        passwordHash: coachPassword,
        role: UserRole.INSTRUCTOR,
        branchId: branch.id,
      }),
    );
    await instructorRepo.save(
      instructorRepo.create({
        userId: coach1User.id,
        bio: '6 năm kinh nghiệm dạy Pilates Reformer, chứng chỉ STOTT quốc tế',
        certifications: 'STOTT Pilates Comprehensive, PMA Certified Instructor',
        specializations: ['Reformer', 'Cadillac', 'Phục hồi sau sinh'],
        hourlyRate: 400000,
        commissionRate: 20,
      }),
    );
  }

  let coach2User = await userRepo.findOne({ where: { email: 'coach.huy@pilatesms.vn' } });
  if (!coach2User) {
    coach2User = await userRepo.save(
      userRepo.create({
        email: 'coach.huy@pilatesms.vn',
        fullName: 'Vũ Quốc Huy',
        phone: '0909555666',
        passwordHash: coachPassword,
        role: UserRole.INSTRUCTOR,
        branchId: branch.id,
      }),
    );
    await instructorRepo.save(
      instructorRepo.create({
        userId: coach2User.id,
        bio: 'Chuyên gia Pilates trị liệu thoái hóa cột sống và đau vai gáy',
        certifications: 'Polestar Pilates Rehabilitation, Balanced Body Master',
        specializations: ['Trị liệu cột sống', 'Reformer nâng cao', 'Matwork'],
        hourlyRate: 450000,
        commissionRate: 25,
      }),
    );
  }

  const memberPassword = await bcrypt.hash('Member@123', 12);
  const sampleMembers = [
    {
      email: 'hang.nguyen@gmail.com',
      name: 'Nguyễn Thu Hằng',
      phone: '0981234001',
      dob: '1995-04-12',
      notes: 'Đau mỏi vai gáy do làm việc văn phòng',
      goals: 'Tăng sức bền, cải thiện tư thế đứng',
    },
    {
      email: 'minh.le@gmail.com',
      name: 'Lê Tuấn Minh',
      phone: '0981234002',
      dob: '1992-08-20',
      notes: 'Thoát vị đĩa đệm L4-L5 nhẹ',
      goals: 'Phục hồi cơ lõi lưng dưới',
    },
    {
      email: 'linh.dang@gmail.com',
      name: 'Đặng Thùy Linh',
      phone: '0981234003',
      dob: '1998-11-05',
      notes: 'Khỏe mạnh, tập thể thao thường xuyên',
      goals: 'Săn chắc cơ bụng, tăng độ dẻo',
    },
  ];

  for (const sm of sampleMembers) {
    let u = await userRepo.findOne({ where: { email: sm.email } });
    if (!u) {
      u = await userRepo.save(
        userRepo.create({
          email: sm.email,
          fullName: sm.name,
          phone: sm.phone,
          passwordHash: memberPassword,
          role: UserRole.MEMBER,
          branchId: branch.id,
        }),
      );
      await memberRepo.save(
        memberRepo.create({
          userId: u.id,
          dateOfBirth: new Date(sm.dob),
          gender: 'female',
          healthNotes: sm.notes,
          goals: sm.goals,
          qrCode: `PILATES-${uuidv4().substring(0, 8).toUpperCase()}`,
        }),
      );
    }
  }

  console.log('⚙️ Seeding Equipment...');
  const countEq = await equipmentRepo.count();
  if (countEq === 0) {
    const eqList = [
      { name: 'Reformer Allegro 2 #01', type: EquipmentType.REFORMER, serial: 'REF-001' },
      { name: 'Reformer Allegro 2 #02', type: EquipmentType.REFORMER, serial: 'REF-002' },
      { name: 'Reformer Allegro 2 #03', type: EquipmentType.REFORMER, serial: 'REF-003' },
      { name: 'Cadillac Trapeze Table', type: EquipmentType.CADILLAC, serial: 'CAD-001' },
      { name: 'Wunda Chair Studio', type: EquipmentType.CHAIR, serial: 'CHR-001' },
    ];
    for (const eq of eqList) {
      await equipmentRepo.save(
        equipmentRepo.create({
          branchId: branch.id,
          name: eq.name,
          type: eq.type,
          status: EquipmentStatus.AVAILABLE,
          serialNumber: eq.serial,
          purchaseDate: new Date('2024-01-10'),
          lastMaintenanceDate: new Date('2024-06-10'),
          nextMaintenanceDate: new Date('2024-12-10'),
        }),
      );
    }
  }

  console.log('📦 Seeding Packages...');
  const countPkg = await packageRepo.count();
  if (countPkg === 0) {
    await packageRepo.save([
      packageRepo.create({
        branchId: branch.id,
        name: 'Gói Trải Nghiệm 5 Buổi',
        description: 'Dành cho học viên mới bắt đầu làm quen với Pilates Reformer',
        type: PackageType.SESSION_BASED,
        totalSessions: 5,
        durationDays: 30,
        price: 1500000,
        isActive: true,
      }),
      packageRepo.create({
        branchId: branch.id,
        name: 'Gói Tiêu Chuẩn 10 Buổi',
        description: '10 buổi tập lớp nhóm Reformer & Mat, hạn dùng 60 ngày',
        type: PackageType.SESSION_BASED,
        totalSessions: 10,
        durationDays: 60,
        price: 2800000,
        isActive: true,
      }),
      packageRepo.create({
        branchId: branch.id,
        name: 'Gói Chuyên Sâu 20 Buổi',
        description: '20 buổi tập kết hợp Reformer + Cadillac, hạn dùng 90 ngày',
        type: PackageType.SESSION_BASED,
        totalSessions: 20,
        durationDays: 90,
        price: 5200000,
        isActive: true,
      }),
      packageRepo.create({
        branchId: branch.id,
        name: 'Gói Tháng Không Giới Hạn',
        description: 'Tập không giới hạn số buổi trong 30 ngày',
        type: PackageType.UNLIMITED,
        durationDays: 30,
        price: 3900000,
        isActive: true,
      }),
    ]);
  }

  console.log('🧘 Seeding Classes...');
  const countClasses = await classRepo.count();
  if (countClasses === 0) {
    const cls1 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Reformer Fundamentals',
        description: 'Lớp Pilates Reformer cơ bản: căn chỉnh tư thế và hơi thở',
        level: ClassLevel.BEGINNER,
        type: ClassType.GROUP,
        defaultInstructorId: coach1User.id,
        defaultRoomId: rooms[0]?.id,
        defaultMaxCapacity: 8,
        durationMinutes: 55,
        price: 300000,
      }),
    );

    const cls2 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Pilates Cột Sống & Phục Hồi',
        description: 'Bài tập tập trung giải tỏa áp lực cột sống và tăng cường cơ lõi',
        level: ClassLevel.ALL,
        type: ClassType.GROUP,
        defaultInstructorId: coach2User.id,
        defaultRoomId: rooms[0]?.id,
        defaultMaxCapacity: 8,
        durationMinutes: 55,
        price: 350000,
      }),
    );

    const cls3 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Cadillac Private 1:1',
        description: 'Buổi tập cá nhân hóa 1 kèm 1 trên máy Cadillac đa năng',
        level: ClassLevel.ALL,
        type: ClassType.PRIVATE,
        defaultInstructorId: coach2User.id,
        defaultRoomId: rooms[1]?.id,
        defaultMaxCapacity: 1,
        durationMinutes: 60,
        price: 800000,
      }),
    );

    console.log('📅 Seeding Schedules...');
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const classDate = new Date(now);
      classDate.setDate(classDate.getDate() + dayOffset);

      const s1 = new Date(classDate);
      s1.setHours(9, 0, 0, 0);
      const e1 = new Date(classDate);
      e1.setHours(9, 55, 0, 0);

      await scheduleRepo.save(
        scheduleRepo.create({
          classId: cls1.id,
          instructorId: coach1User.id,
          roomId: rooms[0]?.id,
          startTime: s1,
          endTime: e1,
          maxCapacity: 8,
          currentEnrolled: 3,
          status: ScheduleStatus.SCHEDULED,
        }),
      );

      const s2 = new Date(classDate);
      s2.setHours(17, 30, 0, 0);
      const e2 = new Date(classDate);
      e2.setHours(18, 25, 0, 0);

      await scheduleRepo.save(
        scheduleRepo.create({
          classId: cls2.id,
          instructorId: coach2User.id,
          roomId: rooms[0]?.id,
          startTime: s2,
          endTime: e2,
          maxCapacity: 8,
          currentEnrolled: 5,
          status: ScheduleStatus.SCHEDULED,
        }),
      );
    }
  }

  const firstMember = await memberRepo.findOne({
    relations: ['user'],
    where: { user: { email: 'hang.nguyen@gmail.com' } },
  });
  const samplePkg = await packageRepo.findOne({ where: { name: 'Gói Tiêu Chuẩn 10 Buổi' } });

  if (firstMember && samplePkg) {
    const existingMp = await memberPackageRepo.findOne({ where: { memberId: firstMember.id } });
    if (!existingMp) {
      const tx = await txRepo.save(
        txRepo.create({
          memberId: firstMember.id,
          amount: samplePkg.price,
          discountAmount: 0,
          finalAmount: samplePkg.price,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentStatus: PaymentStatus.COMPLETED,
          referenceCode: `SEED-TX-${Date.now()}`,
          branchId: branch.id,
        }),
      );

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 60);

      await memberPackageRepo.save(
        memberPackageRepo.create({
          memberId: firstMember.id,
          packageId: samplePkg.id,
          transactionId: tx.id,
          remainingSessions: 8,
          startDate: new Date(),
          expiryDate: expDate,
          status: MemberPackageStatus.ACTIVE,
        }),
      );
    }
  }

  console.log('🏷️ Seeding Promotions...');
  const promoRepo = AppDataSource.getRepository(Promotion);
  let promo = await promoRepo.findOne({ where: { code: 'PILATES2026' } });
  if (!promo) {
    await promoRepo.save(
      promoRepo.create({
        code: 'PILATES2026',
        name: 'Ưu Đãi Khai Xuân 2026',
        description: 'Giảm 10% cho mọi đơn đăng ký gói tập',
        discountPercent: 10,
        minOrderAmount: 1000000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      }),
    );
  }

  console.log('⭐ Seeding Reviews...');
  const reviewRepo = AppDataSource.getRepository(Review);
  if (firstMember) {
    const existingReview = await reviewRepo.findOne({ where: { userId: firstMember.userId } });
    if (!existingReview) {
      await reviewRepo.save(
        reviewRepo.create({
          userId: firstMember.userId,
          targetType: ReviewTargetType.SERVICE,
          rating: 5,
          comment: 'Phòng tập rất sạch sẽ và hiện đại, máy Reformer Allegro 2 tập rất êm ái. HLV Mai Lan hướng dẫn chỉnh form từng động tác rất tận tình!',
        }),
      );
    }
  }

  console.log('🎉 Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 TÀI KHOẢN ĐĂNG NHẬP MẪU:');
  console.log('👑 Admin:       admin@pilatesms.vn / Admin@123456');
  console.log('👩 Lễ tân:      letan@pilatesms.vn / Staff@123');
  console.log('🧘 Huấn luyện:  coach.lan@pilatesms.vn / Coach@123');
  console.log('👤 Học viên:    hang.nguyen@gmail.com / Member@123');
  console.log('----------------------------------------------------');

  await AppDataSource.destroy();
}

runSeeds().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
