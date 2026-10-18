import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Package } from "../../entities/package.entity";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import { CreatePackageDto, AssignPackageDto } from "./dto/create-package.dto";
import { PaginationDto, paginate } from "../../common/dto/pagination.dto";
import { MemberPackageSettingsService } from "./member-package-settings.service";
import { PACKAGE_CATALOG, preparePackageCatalog } from "./package-catalog";

@Injectable()
export class PackagesService {
  constructor(
    private readonly settings: MemberPackageSettingsService,
    @InjectRepository(Package)
    private packagesRepository: Repository<Package>,
    @InjectRepository(MemberPackage)
    private memberPackagesRepository: Repository<MemberPackage>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.packagesRepository.createQueryBuilder("package");

    if (pagination.search) {
      qb.where("package.name ILIKE :search", {
        search: `%${pagination.search}%`,
      });
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy("package.createdAt", pagination.order || "DESC");

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Package #${id} not found`);
    }
    const pkg = await this.packagesRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException(`Package #${id} not found`);
    return pkg;
  }

  create(dto: CreatePackageDto) {
    this.validateTrainingSettings(dto);
    const pkg = this.packagesRepository.create(dto);
    return this.packagesRepository.save(pkg);
  }

  async update(id: string, dto: Partial<CreatePackageDto>) {
    this.validateTrainingSettings(dto);
    const existing = await this.findOne(id);
    await this.packagesRepository.manager.transaction(async (manager) => {
      if (existing.catalogCode)
        await manager.query("SELECT pg_advisory_xact_lock(7612346)");
      const repo = manager.getRepository(Package);
      const current = await repo.findOneBy({ id });
      const candidate = { ...current, ...dto };
      const template = PACKAGE_CATALOG.find(
        (t) => t.code === current.catalogCode,
      );
      if (template) {
        if (
          candidate.type !== "session_based" ||
          candidate.totalSessions !== template.sessions ||
          candidate.privateSessionEnabled !== Boolean(template.mode) ||
          (template.mode && candidate.privateSessionType !== template.mode)
        )
          throw new BadRequestException(
            "Giữ đúng số buổi và hình thức của gói mẫu. Tạo gói khác nếu cần cấu hình riêng.",
          );
        if (
          candidate.isActive &&
          (!Number.isFinite(Number(candidate.price)) ||
            Number(candidate.price) <= 0)
        )
          throw new BadRequestException(
            "Nhập giá bán lớn hơn 0 trước khi mở bán gói.",
          );
        const all = (await repo.find()).filter(
          (p) => p.id !== id && p.catalogCode && p.isActive,
        );
        if (candidate.isActive) all.push(candidate as Package);
        const groups = all.filter((p) =>
          ["group_8", "group_10"].includes(p.catalogCode),
        );
        const personal = all.filter((p) =>
          ["private_4", "duo_4"].includes(p.catalogCode),
        );
        if (
          groups.some((g) =>
            personal.some(
              (p) =>
                Number(p.price) / p.totalSessions <=
                Number(g.price) / g.totalSessions,
            ),
          )
        )
          throw new BadRequestException(
            "Giá mỗi buổi của gói 1:1 và 1:2 phải cao hơn gói lớp chung đang mở bán.",
          );
      }
      await repo.update(id, dto);
    });
    return this.findOne(id);
  }

  prepareCatalog() {
    return preparePackageCatalog(this.packagesRepository.manager);
  }

  private validateTrainingSettings(dto: Partial<CreatePackageDto>) {
    for (const key of [
      "privateSessionEnabled",
      "privateSessionType",
      "privateSessionDurationMinutes",
    ]) {
      if (dto[key] === null)
        throw new BadRequestException("Cấu hình tập riêng không được để trống");
    }
  }

  async remove(id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { success: true };
    }
    await this.findOne(id);
    await this.packagesRepository.update(id, { isActive: false });
    return { success: true };
  }

  async assignToMember(dto: AssignPackageDto) {
    const pkg = await this.findOne(dto.packageId);
    if (!pkg.isActive) throw new BadRequestException("Gói đã ngừng hoạt động");
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
    return this.settings.decorate(
      await this.memberPackagesRepository.find({
        where: { memberId },
        relations: ["package"],
        order: { createdAt: "DESC" },
      }),
    );
  }

  async deductSession(memberPackageId: string) {
    const mp = await this.memberPackagesRepository.findOne({
      where: { id: memberPackageId },
    });
    if (!mp)
      throw new NotFoundException(
        `Member package #${memberPackageId} not found`,
      );

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
