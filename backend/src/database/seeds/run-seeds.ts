import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { Member } from '../../entities/member.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Branch } from '../../entities/branch.entity';
import { Room, RoomType, RoomStatus } from '../../entities/room.entity';
import { Class, ClassLevel, ClassType } from '../../entities/class.entity';
import { ClassSchedule, ScheduleStatus } from '../../entities/class-schedule.entity';
import { Package } from '../../entities/package.entity';
import { preparePackageCatalog } from '../../modules/packages/package-catalog';
import { MemberPackage, MemberPackageStatus } from '../../entities/member-package.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Booking } from '../../entities/booking.entity';
import { CheckIn, CheckInMethod } from '../../entities/check-in.entity';
import { UserRole } from '../../common/enums/user-role.enum';
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

    const sampleRooms = [
      {
        name: 'Phòng VIP 01 - Cadillac Private (1:1)',
        roomType: RoomType.PRIVATE_1V1,
        capacity: 1,
        status: RoomStatus.AVAILABLE,
        amenities: 'Cadillac Studio cao cấp, Wunda Chair, Gương soi toàn thân',
        description: 'Phòng tập 1 vs 1 cá nhân hóa cao độ với Huấn luyện viên trưởng.',
      },
      {
        name: 'Phòng Semi-Private 02 (1:2 Duo)',
        roomType: RoomType.SEMI_PRIVATE_1V2,
        capacity: 2,
        status: RoomStatus.AVAILABLE,
        amenities: '2 máy Reformer, Dây treo kháng lực, Thảm tập cao cấp',
        description: 'Phòng tập bán cá nhân 2 người, phù hợp tập cùng bạn bè hoặc người thân.',
      },
      {
        name: 'Phòng Mini Studio 03 (1:3)',
        roomType: RoomType.SMALL_GROUP_1V3,
        capacity: 3,
        status: RoomStatus.AVAILABLE,
        amenities: '3 máy Reformer Allegro, Spine Corrector, Bóng Pilates',
        description: 'Phòng tập nhóm nhỏ 3 người, giáo viên hướng dẫn tỉ mỉ từng động tác.',
      },
      {
        name: 'Phòng Mini Studio 04 (1:4)',
        roomType: RoomType.SMALL_GROUP_1V4,
        capacity: 4,
        status: RoomStatus.AVAILABLE,
        amenities: '4 máy Reformer Allegro, Dụng cụ bổ trợ, Loa bluetooth',
        description: 'Phòng tập nhóm 4 người, tương tác tốt và không khí luyện tập sôi nổi.',
      },
      {
        name: 'Phòng Reformer Studio Lớn',
        roomType: RoomType.GROUP,
        capacity: 10,
        status: RoomStatus.AVAILABLE,
        amenities: '10 máy Allegro 2 Reformer, Điều hòa 2 chiều, Hệ thống âm thanh vòm',
        description: 'Phòng tập nhóm quy mô lớn với dàn máy Reformer hiện đại bậc nhất.',
      },
    ];

    for (const r of sampleRooms) {
      const room = roomRepo.create({
        branchId: branch.id,
        ...r,
      });
      await roomRepo.save(room);
    }
  }

  const existingRooms = await roomRepo.find({ where: { branchId: branch.id } });
  if (existingRooms.length < 5) {
    const defaultRooms = [
      {
        name: 'Phòng VIP 01 - Cadillac Private (1:1)',
        roomType: RoomType.PRIVATE_1V1,
        capacity: 1,
        status: RoomStatus.AVAILABLE,
        amenities: 'Cadillac Studio cao cấp, Wunda Chair, Gương soi toàn thân',
        description: 'Phòng tập 1 vs 1 cá nhân hóa cao độ với Huấn luyện viên trưởng.',
      },
      {
        name: 'Phòng Semi-Private 02 (1:2 Duo)',
        roomType: RoomType.SEMI_PRIVATE_1V2,
        capacity: 2,
        status: RoomStatus.AVAILABLE,
        amenities: '2 máy Reformer, Dây treo kháng lực, Thảm tập cao cấp',
        description: 'Phòng tập bán cá nhân 2 người, phù hợp tập cùng bạn bè hoặc người thân.',
      },
      {
        name: 'Phòng Mini Studio 03 (1:3)',
        roomType: RoomType.SMALL_GROUP_1V3,
        capacity: 3,
        status: RoomStatus.AVAILABLE,
        amenities: '3 máy Reformer Allegro, Spine Corrector, Bóng Pilates',
        description: 'Phòng tập nhóm nhỏ 3 người, giáo viên hướng dẫn tỉ mỉ từng động tác.',
      },
      {
        name: 'Phòng Mini Studio 04 (1:4)',
        roomType: RoomType.SMALL_GROUP_1V4,
        capacity: 4,
        status: RoomStatus.AVAILABLE,
        amenities: '4 máy Reformer Allegro, Dụng cụ bổ trợ, Loa bluetooth',
        description: 'Phòng tập nhóm 4 người, tương tác tốt và không khí luyện tập sôi nổi.',
      },
    ];
    for (const r of defaultRooms) {
      const found = existingRooms.find((er) => er.roomType === r.roomType);
      if (!found) {
        await roomRepo.save(roomRepo.create({ branchId: branch.id, ...r }));
      }
    }
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

  console.log('📦 Seeding Packages...');
  await preparePackageCatalog(AppDataSource.manager);

  const defaultCatalogPrices: Record<string, number> = {
    trial_2: 400000,
    group_8: 2000000,
    group_10: 2400000,
    private_4: 3200000,
    duo_4: 2000000,
  };
  for (const [code, defaultPrice] of Object.entries(defaultCatalogPrices)) {
    const pkgItem = await packageRepo.findOne({ where: { catalogCode: code } });
    if (pkgItem && Number(pkgItem.price) <= 0) {
      pkgItem.price = defaultPrice;
      pkgItem.isActive = true;
      await packageRepo.save(pkgItem);
    }
  }

  console.log('🧘 Seeding Classes...');
  let cls1 = await classRepo.findOne({ where: { name: 'Reformer Fundamentals' } });
  if (!cls1) {
    cls1 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Reformer Fundamentals',
        description: 'Lớp Pilates Reformer cơ bản: căn chỉnh tư thế và hơi thở',
        level: ClassLevel.BEGINNER,
        type: ClassType.GROUP,
        defaultInstructorId: coach1User.id,
        defaultRoomId: rooms.find((r) => r.roomType === RoomType.GROUP)?.id ?? rooms[0]?.id,
        defaultMaxCapacity: 8,
        durationMinutes: 60,
        price: 300000,
      }),
    );
  }

  let cls2 = await classRepo.findOne({ where: { name: 'Pilates Cột Sống & Phục Hồi' } });
  if (!cls2) {
    cls2 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Pilates Cột Sống & Phục Hồi',
        description: 'Bài tập tập trung giải tỏa áp lực cột sống và tăng cường cơ lõi',
        level: ClassLevel.ALL,
        type: ClassType.GROUP,
        defaultInstructorId: coach2User.id,
        defaultRoomId: rooms.find((r) => r.roomType === RoomType.GROUP)?.id ?? rooms[0]?.id,
        defaultMaxCapacity: 8,
        durationMinutes: 60,
        price: 350000,
      }),
    );
  }

  let cls3 = await classRepo.findOne({ where: { name: 'Cadillac Private 1:1' } });
  if (!cls3) {
    cls3 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Cadillac Private 1:1',
        description: 'Buổi tập cá nhân hóa 1 kèm 1 trên máy Cadillac đa năng',
        level: ClassLevel.ALL,
        type: ClassType.PRIVATE,
        defaultInstructorId: coach2User.id,
        defaultRoomId: rooms.find((r) => r.roomType === RoomType.PRIVATE_1V1)?.id ?? rooms[0]?.id,
        defaultMaxCapacity: 1,
        durationMinutes: 60,
        price: 800000,
      }),
    );
  }

  let cls4 = await classRepo.findOne({ where: { name: 'Reformer Semi-Private 1:2 (Duo)' } });
  if (!cls4) {
    cls4 = await classRepo.save(
      classRepo.create({
        branchId: branch.id,
        name: 'Reformer Semi-Private 1:2 (Duo)',
        description: 'Buổi tập đôi 1 kèm 2 trên máy Reformer',
        level: ClassLevel.ALL,
        type: ClassType.SEMI_PRIVATE,
        defaultInstructorId: coach1User.id,
        defaultRoomId: rooms.find((r) => r.roomType === RoomType.SEMI_PRIVATE_1V2)?.id ?? rooms[0]?.id,
        defaultMaxCapacity: 2,
        durationMinutes: 60,
        price: 500000,
      }),
    );
  }

  console.log('📅 Seeding Upcoming Schedules...');
  const groupRoom = rooms.find((r) => r.roomType === RoomType.GROUP) ?? rooms[0];
  const privRoom = rooms.find((r) => r.roomType === RoomType.PRIVATE_1V1) ?? rooms[0];
  const duoRoom = rooms.find((r) => r.roomType === RoomType.SEMI_PRIVATE_1V2) ?? rooms[0];
  const upcomingCount = await scheduleRepo
    .createQueryBuilder('s')
    .where('s.startTime > :now', { now: new Date() })
    .getCount();

  if (upcomingCount < 10) {
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const classDate = new Date(now);
      classDate.setDate(classDate.getDate() + dayOffset);

      const slots = [
        { cls: cls1, coach: coach1User, room: groupRoom, startH: 8, startM: 0, endH: 9, endM: 0, cap: 8, enrolled: 2 },
        { cls: cls1, coach: coach1User, room: groupRoom, startH: 10, startM: 0, endH: 11, endM: 0, cap: 8, enrolled: 4 },
        { cls: cls4, coach: coach1User, room: duoRoom, startH: 14, startM: 0, endH: 15, endM: 0, cap: 2, enrolled: 0 },
        { cls: cls1, coach: coach1User, room: groupRoom, startH: 18, startM: 0, endH: 19, endM: 0, cap: 8, enrolled: 3 },
        { cls: cls2, coach: coach2User, room: groupRoom, startH: 9, startM: 0, endH: 10, endM: 0, cap: 8, enrolled: 3 },
        { cls: cls3, coach: coach2User, room: privRoom, startH: 15, startM: 0, endH: 16, endM: 0, cap: 1, enrolled: 0 },
        { cls: cls2, coach: coach2User, room: groupRoom, startH: 17, startM: 30, endH: 18, endM: 30, cap: 8, enrolled: 5 },
        { cls: cls2, coach: coach2User, room: groupRoom, startH: 19, startM: 15, endH: 20, endM: 15, cap: 8, enrolled: 2 },
      ];

      for (const sl of slots) {
        const sTime = new Date(classDate);
        sTime.setHours(sl.startH, sl.startM, 0, 0);
        const eTime = new Date(classDate);
        eTime.setHours(sl.endH, sl.endM, 0, 0);
        if (sTime <= now) continue;

        const exists = await scheduleRepo.findOne({
          where: { instructorId: sl.coach.id, startTime: sTime },
        });
        if (!exists) {
          await scheduleRepo.save(
            scheduleRepo.create({
              classId: sl.cls.id,
              instructorId: sl.coach.id,
              roomId: sl.room?.id,
              startTime: sTime,
              endTime: eTime,
              maxCapacity: sl.cap,
              currentEnrolled: sl.enrolled,
              status: ScheduleStatus.SCHEDULED,
            }),
          );
        }
      }
    }
  }

  const firstMember = await memberRepo.findOne({
    relations: ['user'],
    where: { user: { email: 'hang.nguyen@gmail.com' } },
  });
  const secondMember = await memberRepo.findOne({
    relations: ['user'],
    where: { user: { email: 'minh.le@gmail.com' } },
  });
  const group10Pkg =
    (await packageRepo.findOne({ where: { catalogCode: 'group_10' } })) ??
    (await packageRepo.findOne({ where: { isActive: true } }));

  for (const m of [firstMember, secondMember]) {
    if (m && group10Pkg) {
      const existingMp = await memberPackageRepo.findOne({
        where: { memberId: m.id, status: MemberPackageStatus.ACTIVE },
      });
      if (!existingMp) {
        const tx = await txRepo.save(
          txRepo.create({
            memberId: m.id,
            packageId: group10Pkg.id,
            amount: group10Pkg.price,
            discountAmount: 0,
            finalAmount: group10Pkg.price,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            paymentStatus: PaymentStatus.COMPLETED,
            referenceCode: `SEED-TX-${Date.now()}-${m.id.slice(0, 4)}`,
            branchId: branch.id,
          }),
        );

        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 60);

        await memberPackageRepo.save(
          memberPackageRepo.create({
            memberId: m.id,
            packageId: group10Pkg.id,
            transactionId: tx.id,
            remainingSessions: group10Pkg.totalSessions || 10,
            startDate: new Date(),
            expiryDate: expDate,
            status: MemberPackageStatus.ACTIVE,
          }),
        );
      }
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
