import { EntityManager } from "typeorm";
import { Package } from "../../entities/package.entity";
import { PackageType } from "../../common/enums/package-type.enum";
import { PrivateSessionType } from "../../common/enums/private-session-type.enum";

export const PACKAGE_CATALOG = [
  {
    code: "trial_2",
    name: "Tập thử · 2 buổi",
    sessions: 2,
    days: 14,
    mode: null,
    description: "2 buổi làm quen với Pilates trong lớp chung.",
  },
  {
    code: "group_8",
    name: "Lớp chung · 8 buổi",
    sessions: 8,
    days: 60,
    mode: null,
    description: "8 buổi tham gia các lớp chung theo lịch của studio.",
  },
  {
    code: "group_10",
    name: "Lớp chung · 10 buổi",
    sessions: 10,
    days: 60,
    mode: null,
    description: "10 buổi tham gia các lớp chung theo lịch của studio.",
  },
  {
    code: "private_4",
    name: "Tập riêng 1:1 · 4 buổi",
    sessions: 4,
    days: 30,
    mode: PrivateSessionType.PRIVATE_1V1,
    description: "4 buổi một HLV kèm một học viên. Chỉ đặt lịch 1:1.",
  },
  {
    code: "duo_4",
    name: "Tập đôi 1:2 · 4 buổi",
    sessions: 4,
    days: 30,
    mode: PrivateSessionType.SEMI_PRIVATE_1V2,
    description:
      "4 buổi tập đôi. Mỗi người có gói riêng và được lễ tân ghép cặp.",
  },
] as const;

export async function preparePackageCatalog(manager: EntityManager) {
  return manager.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(7612346)");
    const repo = tx.getRepository(Package);
    let created = 0;
    for (const template of PACKAGE_CATALOG) {
      if (await repo.findOneBy({ catalogCode: template.code })) continue;
      await repo.save(
        repo.create({
          catalogCode: template.code,
          name: template.name,
          description: template.description,
          type: PackageType.SESSION_BASED,
          totalSessions: template.sessions,
          durationDays: template.days,
          price: 0,
          isActive: false,
          privateSessionEnabled: Boolean(template.mode),
          privateSessionType: template.mode ?? PrivateSessionType.PRIVATE_1V1,
          privateSessionDurationMinutes: 60,
        }),
      );
      created++;
    }
    // Retire only the four original demo offers. Purchased packages, balances,
    // historical prices and all custom offers remain intact.
    const retired = await repo
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where("catalog_code IS NULL AND name IN (:...names)", {
        names: [
          "Gói Trải Nghiệm 5 Buổi",
          "Gói Tiêu Chuẩn 10 Buổi",
          "Gói Chuyên Sâu 20 Buổi",
          "Gói Tháng Không Giới Hạn",
        ],
      })
      .andWhere("is_active = true")
      .execute();
    return {
      created,
      retired: retired.affected ?? 0,
      templates: PACKAGE_CATALOG.length,
    };
  });
}
