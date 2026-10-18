import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import {
  MemberPackage,
  MemberPackageStatus,
} from "../../entities/member-package.entity";
import { User } from "../../entities/user.entity";
import { Booking } from "../../entities/booking.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { SystemSetting } from "../../entities/system-setting.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { PackageType } from "../../common/enums/package-type.enum";
import { PrivateSessionType } from "../../common/enums/private-session-type.enum";
import { MemberPackageSettingsDto } from "./dto/member-package-settings.dto";

@Injectable()
export class MemberPackageSettingsService {
  constructor(
    @InjectRepository(MemberPackage)
    private readonly packages: Repository<MemberPackage>,
  ) {}

  async decorate<T extends MemberPackage>(items: T[]) {
    if (!items.length) return [];
    const ids = items.map((p) => p.id);
    const details = await this.packages.find({
      where: { id: In(ids) },
      relations: [
        "preferredInstructor",
        "duoPartnerPackage",
        "duoPartnerPackage.member",
        "duoPartnerPackage.member.user",
        "duoPartnerPackage.package",
      ],
    });
    const bookings = await this.packages.manager
      .getRepository(Booking)
      .find({ where: { memberPackageId: In(ids) } });
    const walkIns = await this.packages.manager
      .getRepository(CheckIn)
      .find({ where: { memberPackageId: In(ids), bookingId: IsNull() } });
    const policy = await this.packages.manager
      .getRepository(SystemSetting)
      .findOneBy({ key: "config" });
    return items.map((mp) => {
      const detail = details.find((p) => p.id === mp.id);
      const own = bookings.filter((b) => b.memberPackageId === mp.id);
      const directCount = walkIns.filter(
        (ci) => ci.memberPackageId === mp.id,
      ).length;
      const attendedSessions =
        own.filter((b) => b.status === "attended").length + directCount;
      const reservedSessions = own.filter(
        (b) => b.status === "confirmed",
      ).length;
      const forfeitedSessions = own.filter(
        (b) =>
          b.sessionDeducted &&
          (b.status === "no_show" || b.status === "cancelled"),
      ).length;
      const accounted =
        own.filter((b) => b.sessionDeducted).length + directCount;
      const otherUsedSessions =
        mp.package?.type === PackageType.SESSION_BASED
          ? Math.max(
              0,
              (mp.package.totalSessions ?? 0) -
                (mp.remainingSessions ?? 0) -
                accounted,
            )
          : 0;
      const partner = detail?.duoPartnerPackage;
      return {
        ...mp,
        attendedSessions,
        reservedSessions,
        forfeitedSessions,
        otherUsedSessions,
        cancelHoursLimit: policy?.value?.cancelHoursLimit ?? 2,
        autoPromoteWaitlist: policy?.value?.autoPromoteWaitlist !== false,
        preferredInstructorId: detail?.preferredInstructorId ?? null,
        preferredInstructor: detail?.preferredInstructor
          ? {
              id: detail.preferredInstructor.id,
              fullName: detail.preferredInstructor.fullName,
            }
          : null,
        duoPartnerPackageId: detail?.duoPartnerPackageId ?? null,
        duoPartner: partner
          ? {
              packageId: partner.id,
              memberId: partner.memberId,
              fullName: partner.member?.user?.fullName ?? "Học viên tập cùng",
              packageName: partner.package?.name,
            }
          : null,
      };
    });
  }

  private isDuo(mp: MemberPackage) {
    return (
      mp.package?.privateSessionEnabled &&
      mp.package.privateSessionType === PrivateSessionType.SEMI_PRIVATE_1V2
    );
  }

  async partnerOptions(id: string) {
    const current = await this.packages.findOne({
      where: { id },
      relations: ["package"],
    });
    if (!current) throw new NotFoundException("Gói học viên không tồn tại");
    if (!this.isDuo(current)) return [];
    const candidates = await this.packages
      .createQueryBuilder("mp")
      .innerJoinAndSelect("mp.package", "p")
      .innerJoinAndSelect("mp.member", "m")
      .innerJoinAndSelect("m.user", "u")
      .where("mp.memberId != :memberId", { memberId: current.memberId })
      .andWhere("mp.status = :status", { status: MemberPackageStatus.ACTIVE })
      .andWhere("u.isActive = true")
      .andWhere("p.privateSessionEnabled = true")
      .andWhere("p.privateSessionType = :mode", {
        mode: PrivateSessionType.SEMI_PRIVATE_1V2,
      })
      .andWhere("p.privateSessionDurationMinutes = :duration", {
        duration: current.package.privateSessionDurationMinutes,
      })
      .andWhere(
        "(mp.duoPartnerPackageId IS NULL OR mp.duoPartnerPackageId = :id)",
        { id },
      )
      .andWhere("(mp.expiryDate IS NULL OR mp.expiryDate >= CURRENT_DATE)")
      .andWhere("(p.type != :type OR mp.remainingSessions > 0)", {
        type: PackageType.SESSION_BASED,
      })
      .orderBy("u.fullName", "ASC")
      .getMany();
    return candidates.map((mp) => ({
      packageId: mp.id,
      memberId: mp.memberId,
      fullName: mp.member.user.fullName,
      packageName: mp.package.name,
      remainingSessions: mp.remainingSessions,
    }));
  }

  async update(
    id: string,
    dto: MemberPackageSettingsDto,
    ownerUserId?: string,
  ) {
    await this.packages.manager.transaction(async (manager) => {
      // Pair edits share a transaction lock; row locks also serialize them with bookings.
      if (dto.duoPartnerPackageId !== undefined)
        await manager.query("SELECT pg_advisory_xact_lock(7612345)");
      const repo = manager.getRepository(MemberPackage);
      const initial = await repo.findOneBy({ id });
      if (!initial) throw new NotFoundException("Gói học viên không tồn tại");
      const ids = [
        ...new Set(
          [id, initial.duoPartnerPackageId, dto.duoPartnerPackageId].filter(
            Boolean,
          ),
        ),
      ].sort();
      const locked = await repo
        .createQueryBuilder("mp")
        .where("mp.id IN (:...ids)", { ids })
        .orderBy("mp.id", "ASC")
        .setLock("pessimistic_write")
        .getMany();
      const current = await repo.findOne({
        where: { id },
        relations: ["package", "member"],
      });
      if (ownerUserId && current.member.userId !== ownerUserId)
        throw new ForbiddenException("Gói không thuộc tài khoản của bạn");
      if (dto.preferredInstructorId) {
        const coach = await manager
          .getRepository(User)
          .findOneBy({
            id: dto.preferredInstructorId,
            role: UserRole.INSTRUCTOR,
            isActive: true,
          });
        if (!coach)
          throw new BadRequestException(
            "HLV không tồn tại hoặc đã ngừng hoạt động",
          );
      }
      if (
        dto.duoPartnerPackageId !== undefined &&
        dto.duoPartnerPackageId !== current.duoPartnerPackageId
      ) {
        if (!this.isDuo(current))
          throw new BadRequestException("Chỉ ghép đôi cho gói tập 1:2");
        const target = dto.duoPartnerPackageId
          ? await repo.findOne({
              where: { id: dto.duoPartnerPackageId },
              relations: ["package", "member", "member.user"],
            })
          : null;
        const today = new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 10);
        if (
          dto.duoPartnerPackageId &&
          (!target ||
            target.memberId === current.memberId ||
            !this.isDuo(target) ||
            target.status !== MemberPackageStatus.ACTIVE ||
            !target.member.user.isActive ||
            (target.expiryDate &&
              String(target.expiryDate).slice(0, 10) < today) ||
            (target.package.type === PackageType.SESSION_BASED &&
              target.remainingSessions <= 0) ||
            target.package.privateSessionDurationMinutes !==
              current.package.privateSessionDurationMinutes)
        )
          throw new BadRequestException(
            "Cần gói 1:2 còn hiệu lực, cùng thời lượng của một học viên khác",
          );
        if (target?.duoPartnerPackageId && target.duoPartnerPackageId !== id)
          throw new ConflictException(
            "Học viên này đã được ghép với người khác",
          );
        if (
          target &&
          (current.status !== MemberPackageStatus.ACTIVE ||
            (current.expiryDate &&
              String(current.expiryDate).slice(0, 10) < today) ||
            (current.package.type === PackageType.SESSION_BASED &&
              current.remainingSessions <= 0))
        )
          throw new BadRequestException(
            "Gói hiện tại chưa hoạt động, đã hết hạn hoặc hết buổi",
          );
        const future = await manager
          .getRepository(Booking)
          .createQueryBuilder("b")
          .innerJoin("b.schedule", "s")
          .where("b.memberPackageId IN (:...ids)", {
            ids: locked.map((p) => p.id),
          })
          .andWhere("b.status IN (:...statuses)", {
            statuses: ["confirmed", "waitlisted"],
          })
          .andWhere("s.startTime > :now AND s.status != :cancelled", {
            now: new Date(),
            cancelled: "cancelled",
          })
          .getCount();
        if (future)
          throw new ConflictException(
            "Cần hủy hoặc xử lý các lịch sắp tới trước khi đổi người tập cùng",
          );
        if (current.duoPartnerPackageId)
          await repo.update(current.duoPartnerPackageId, {
            duoPartnerPackageId: null,
          });
        current.duoPartnerPackageId = target?.id ?? null;
        if (target) await repo.update(target.id, { duoPartnerPackageId: id });
      }
      if (dto.preferredInstructorId !== undefined)
        current.preferredInstructorId = dto.preferredInstructorId;
      await repo.save(current);
    });
    return (
      await this.decorate([
        await this.packages.findOne({ where: { id }, relations: ["package"] }),
      ])
    )[0];
  }
}
